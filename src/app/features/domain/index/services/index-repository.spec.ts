// @vitest-environment jsdom

import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IndexedDB, LocalDBService } from '../../../../shared/local-db/local-db.service';
import { IndexGASRepository } from './index-gas-repository';
import { IndexRepository } from './index-repository';

describe('IndexRepository remote refresh', () => {
  const databaseName = 'index-refresh-spec';
  let database: IndexedDB;

  beforeEach(() => {
    database = new IndexedDB(databaseName);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        IndexRepository,
        { provide: LocalDBService, useValue: { indexedDB: database } },
        {
          provide: IndexGASRepository,
          useValue: {
            getDomain: vi.fn().mockResolvedValue([
              { id: 'remote-1', bookId: 'book-1', itemRow: 2, chapter: 'Remote', theme: 'Updated', subtheme: '', tags: '#remote', contributor: 'server', feed: 0, syncStatus: 'synced' },
              { id: 'local-pending', bookId: 'book-1', itemRow: 3, chapter: 'Server copy', theme: 'Server', subtheme: '', tags: '', contributor: 'server', feed: 0, syncStatus: 'synced' },
            ]),
          },
        },
      ],
    });
  });

  afterEach(async () => {
    database.close();
    await Dexie.delete(databaseName);
  });

  it('replaces stale synced rows but preserves pending and failed local edits', async () => {
    await database.books.add({ id: 'book-1', row: 7, name: 'Book', author: 'Author', isbn: '', language: 'English', subject: '', topic: '', active: true, page: 0, pages: 0, count: 0, updatedAt: '' });
    await database.indexes.bulkPut([
      { id: 'stale', bookId: 'book-1', bookRow: 7, itemRow: 1, chapter: 'Stale', theme: '', subtheme: '', tags: [], contributor: '', feed: 0, syncStatus: 'synced' },
      { id: 'local-pending', bookId: 'book-1', bookRow: 7, itemRow: 3, chapter: 'My edit', theme: 'Keep', subtheme: '', tags: [], contributor: '', feed: 0, syncStatus: 'pending' },
      { id: 'local-error', bookId: 'book-1', bookRow: 7, itemRow: 4, chapter: 'Retry me', theme: '', subtheme: '', tags: [], contributor: '', feed: 0, syncStatus: 'error' },
    ]);

    const refreshed = await TestBed.inject(IndexRepository).getDomain(7);

    expect(await database.indexes.get(['book-1', 'stale'])).toBeUndefined();
    expect(await database.indexes.get(['book-1', 'remote-1'])).toMatchObject({ theme: 'Updated', syncStatus: 'synced' });
    expect(await database.indexes.get(['book-1', 'local-pending'])).toMatchObject({ chapter: 'My edit', syncStatus: 'pending' });
    expect(await database.indexes.get(['book-1', 'local-error'])).toMatchObject({ chapter: 'Retry me', syncStatus: 'error' });
    expect(refreshed.map((record) => record.id).sort()).toEqual(['local-error', 'local-pending', 'remote-1']);
  });

  it('does not erase or overwrite a write that completes during an older remote refresh', async () => {
    await database.books.add({ id: 'book-1', row: 7, name: 'Book', author: 'Author', isbn: '', language: 'English', subject: '', topic: '', active: true, page: 0, pages: 0, count: 0, updatedAt: '' });
    const existing = { id: 'edited', bookId: 'book-1', bookRow: 7, itemRow: 2, chapter: 'Before', theme: 'Original', subtheme: '', tags: [], contributor: '', feed: 0, syncStatus: 'synced' as const };
    await database.indexes.put(existing);
    let resolveRemote!: (rows: unknown[]) => void;
    const getDomain = vi.fn().mockReturnValue(new Promise(resolve => { resolveRemote = resolve; }));
    TestBed.inject(IndexGASRepository).getDomain = getDomain;
    const refresh = TestBed.inject(IndexRepository).getDomain(7);
    await vi.waitFor(() => expect(getDomain).toHaveBeenCalledOnce());
    await database.indexes.put({ ...existing, theme: 'Edited locally' });
    await database.indexes.put({ ...existing, id: 'new-synced', theme: 'New local write' });
    resolveRemote([{ ...existing, theme: 'Old server data', tags: '' }]);
    await refresh;
    expect(await database.indexes.get(['book-1', 'edited'])).toMatchObject({ theme: 'Edited locally' });
    expect(await database.indexes.get(['book-1', 'new-synced'])).toMatchObject({ theme: 'New local write' });
  });

  it('does not restore an item deleted while an older remote refresh is in flight', async () => {
    await database.books.add({ id: 'book-1', row: 7, name: 'Book', author: 'Author', isbn: '', language: 'English', subject: '', topic: '', active: true, page: 0, pages: 0, count: 0, updatedAt: '' });
    const existing = { id: 'deleted', bookId: 'book-1', bookRow: 7, itemRow: 2, chapter: 'Chapter', theme: 'Theme', subtheme: '', tags: [], contributor: '', feed: 0, syncStatus: 'synced' as const };
    await database.indexes.put(existing);
    let resolveRemote!: (rows: unknown[]) => void;
    const getDomain = vi.fn().mockReturnValue(new Promise(resolve => { resolveRemote = resolve; }));
    TestBed.inject(IndexGASRepository).getDomain = getDomain;
    const refresh = TestBed.inject(IndexRepository).getDomain(7);
    await vi.waitFor(() => expect(getDomain).toHaveBeenCalledOnce());
    await database.indexes.delete(['book-1', 'deleted']);
    resolveRemote([{ ...existing, tags: '' }]);
    expect(await refresh).toEqual([]);
    expect(await database.indexes.get(['book-1', 'deleted'])).toBeUndefined();
  });
});