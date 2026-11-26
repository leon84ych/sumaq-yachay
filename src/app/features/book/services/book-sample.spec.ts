// @vitest-environment jsdom

import 'fake-indexeddb/auto';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import Dexie from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../../core/services/config/config.service';
import { GlobalLoadingService } from '../../../core/services/loading/global-loading.service';
import { PermissionService } from '../../../core/services/permission/permission.service';
import { StudySearchService } from '../../../core/services/search/study-search.service';
import { IndexedDB, LocalDBService } from '../../../shared/local-db/local-db.service';
import { LanguageService } from '../../../shared/language/language.service';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';
import { BookGASRepository } from './book-gas-repository';
import { BookService } from './book.service';

describe('sample book CRUD', () => {
  const databaseName = 'sample-book-crud-spec';

  afterEach(async () => {
    TestBed.resetTestingModule();
    await Dexie.delete(databaseName);
  });

  it('persists changes locally without contacting GAS', async () => {
    const database = new IndexedDB(databaseName);
    const local = new LocalDBService();
    Object.defineProperty(local, 'indexedDB', { value: database });
    await local.seedLocalSampleData();
    const remote = { createItem: vi.fn(), deleteItem: vi.fn(), cloneBookItem: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        BookService,
        { provide: LocalDBService, useValue: local },
        { provide: BookGASRepository, useValue: remote },
        { provide: ConfigService, useValue: { localSampleDataEnabled: signal(true), isLocalSampleDataEnabled: () => true } },
        { provide: GoogleAuthService, useValue: { idToken: () => null } },
        { provide: GlobalLoadingService, useValue: { begin: () => 1, end: vi.fn() } },
        { provide: PermissionService, useValue: { setRole: vi.fn() } },
        { provide: StudySearchService, useValue: { query: signal('') } },
      ],
    });
    const service = TestBed.inject(BookService);
    await service.loadFromLocal();
    const initialMaxRow = Math.max(...service.items().map(book => book.row));
    const input = {
      id: 'local-book', isbn: '', subject: 'Knowledge', topic: 'Local', name: 'Local book',
      author: 'Author', language: 'Quechua', active: true, page: 0, pages: 0, count: 0, row: 0,
    };

    await service.saveItem(input, false);
    expect(TestBed.inject(LanguageService).languages()).toContain('Quechua');
    expect(await database.books.get(input.id)).toMatchObject({ row: initialMaxRow + 1, name: input.name });
    await expect(service.saveItem({ ...input, name: 'Duplicate' }, false)).rejects.toThrow('BOOK.ERRORS.duplicateBookId');
    expect(await database.books.get(input.id)).toMatchObject({ name: input.name });
    await service.saveItem({ ...input, name: 'Edited' }, true);
    expect(service.items().find(book => book.id === input.id)).toMatchObject({ row: initialMaxRow + 1, name: 'Edited' });
    await service.toggleActive(service.items().find(book => book.id === input.id)!);
    expect(await database.books.get(input.id)).toMatchObject({ active: false });
    expect(await service.deleteBookRecord(service.items().find(book => book.id === input.id)!)).toBe(true);
    expect(await database.books.get(input.id)).toBeUndefined();
    expect(service.items().some(book => book.id === input.id)).toBe(false);
    await service.saveItem({ ...input, id: 'another-book' }, false);
    expect(await database.books.get('another-book')).toMatchObject({ row: initialMaxRow + 2 });
    expect(await service.cloneBookRecordFromSheet('https://example.com')).toBe(false);
    expect(remote.createItem).not.toHaveBeenCalled();
    expect(remote.deleteItem).not.toHaveBeenCalled();
    expect(remote.cloneBookItem).not.toHaveBeenCalled();
    database.close();
  });

  it('discovers languages from a remote book refresh', async () => {
    const database = new IndexedDB(databaseName);
    const local = new LocalDBService();
    Object.defineProperty(local, 'indexedDB', { value: database });
    const remoteBook = { id: 'remote', row: 1, language: 'Kichwa' };
    const getBooks = vi.fn().mockResolvedValue({
      status: 'success', data: { rows: [remoteBook], totalPages: 1 },
    });
    TestBed.configureTestingModule({
      providers: [
        BookService,
        { provide: LocalDBService, useValue: local },
        { provide: BookGASRepository, useValue: { getBooks } },
        { provide: ConfigService, useValue: { localSampleDataEnabled: signal(false), isLocalSampleDataEnabled: () => false } },
        { provide: GoogleAuthService, useValue: { idToken: () => 'token' } },
        { provide: GlobalLoadingService, useValue: { begin: () => 1, end: vi.fn() } },
        { provide: PermissionService, useValue: { setRole: vi.fn() } },
        { provide: StudySearchService, useValue: { query: signal('') } },
      ],
    });
    const service = TestBed.inject(BookService);
    TestBed.flushEffects();
    await vi.waitFor(() => expect(service.isLoading()).toBe(false));
    await service.syncFromRemote();
    await vi.waitFor(() => expect(TestBed.inject(LanguageService).languages()).toContain('Kichwa'));
    expect(await database.languages.get('kichwa')).toEqual({ key: 'kichwa', name: 'Kichwa' });
    TestBed.resetTestingModule();
    database.close();
  });
});