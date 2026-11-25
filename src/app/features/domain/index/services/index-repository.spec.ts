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
});