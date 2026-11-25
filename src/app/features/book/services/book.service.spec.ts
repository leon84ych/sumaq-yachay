// @vitest-environment jsdom

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { ConfigService } from '../../../core/services/config/config.service';
import { LocalDBService } from '../../../shared/local-db/local-db.service';
import { BookGASRepository } from './book-gas-repository';
import { BookService } from './book.service';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';

describe('BookService', () => {
  let logoutSpy: ReturnType<typeof vi.fn>;
  let getBooksSpy: ReturnType<typeof vi.fn>;
  let idToken: ReturnType<typeof signal<string | null>>;
  let booksToArray: ReturnType<typeof vi.fn>;
  let bulkPutSpy: ReturnType<typeof vi.fn>;
  let clearAllTablesSpy: ReturnType<typeof vi.fn>;
  let createBookSpy: ReturnType<typeof vi.fn>;
  let cloneBooksSpy: ReturnType<typeof vi.fn>;
  let cloneBookItemSpy: ReturnType<typeof vi.fn>;
  let seedLocalSampleDataSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    logoutSpy = vi.fn();
    idToken = signal<string | null>(null);
    booksToArray = vi.fn().mockResolvedValue([]);
    bulkPutSpy = vi.fn().mockResolvedValue(undefined);
    clearAllTablesSpy = vi.fn().mockResolvedValue(undefined);
    createBookSpy = vi.fn();
    cloneBooksSpy = vi.fn();
    cloneBookItemSpy = vi.fn();
    seedLocalSampleDataSpy = vi.fn().mockResolvedValue(undefined);
    getBooksSpy = vi.fn().mockReturnValue(
      of({
        status: 'error',
        message: 'Error: Authentication error: Invalid or expired Google token.',
      })
    );

    TestBed.configureTestingModule({
      providers: [
        BookService,
        {
          provide: LocalDBService,
          useValue: {
            indexedDB: {
              tables: [],
              transaction: async (_mode: string, _table: unknown, operation: () => Promise<void>) => operation(),
              books: {
                toArray: booksToArray,
                clear: vi.fn().mockResolvedValue(undefined),
                bulkPut: bulkPutSpy,
                put: vi.fn().mockResolvedValue(undefined),
                delete: vi.fn().mockResolvedValue(undefined),
              },
            },
          },
        },
        {
          provide: BookGASRepository,
          useValue: {
            getBooks: (...args: unknown[]) => firstValueFrom(getBooksSpy(...args)),
            createItem: (...args: unknown[]) => firstValueFrom(createBookSpy(...args)),
            cloneBook: (...args: unknown[]) => firstValueFrom(cloneBooksSpy(...args)),
            cloneBookItem: (...args: unknown[]) => firstValueFrom(cloneBookItemSpy(...args)),
            deleteItem: vi.fn().mockResolvedValue({ status: 'success' }),
          },
        },
        {
          provide: GoogleAuthService,
          useValue: {
            idToken: () => idToken(),
            logout: logoutSpy,
          },
        },
      ],
    });
  });

  it('logs out the user when Google says the token is invalid or expired', async () => {
    idToken.set('valid-token');
    const service = TestBed.inject(BookService);

    await service.syncFromRemote();

    expect(logoutSpy).toHaveBeenCalled();
  });

  it('clears local data when the remote books list is empty', async () => {
    idToken.set('valid-token');
    getBooksSpy.mockReturnValue(
      of({
        status: 'success',
        timestamp: '2026-01-01T00:00:00.000Z',
        data: { rows: [], totalPages: 0 },
      }),
    );
    const service = TestBed.inject(BookService);

    await service.syncFromRemote();

    expect(clearAllTablesSpy).toHaveBeenCalledOnce();
    expect(service.items()).toEqual([]);
    expect(service.errorMessage()).toBeNull();
  });

  it('does not seed fabricated records when the local book is empty', async () => {
    const service = TestBed.inject(BookService);

    await service.loadFromLocal();

    expect(service.items()).toEqual([]);
    expect(bulkPutSpy).not.toHaveBeenCalled();
  });

  it('reports loading while the initial IndexedDB book read is pending', async () => {
    let resolveLocal: ((items: unknown[]) => void) | undefined;
    booksToArray.mockImplementation(
      () =>
        new Promise<unknown[]>((resolve) => {
          resolveLocal = resolve;
        }),
    );

    const service = TestBed.inject(BookService);
    await Promise.resolve();

    expect(service.isLoading()).toBe(true);

    resolveLocal?.([]);
    await Promise.resolve();
    expect(service.isLoading()).toBe(false);
  });

  it('gets the book after authentication changes the token signal', async () => {
    TestBed.inject(BookService);

    idToken.set('valid-token');
    TestBed.flushEffects();
    await Promise.resolve();

    expect(getBooksSpy).toHaveBeenCalled();
  });

  it('loads local sample data and skips book requests when enabled', async () => {
    const configService = TestBed.inject(ConfigService);
    configService.setLocalSampleDataEnabled(true);
    idToken.set('valid-token');
    const service = TestBed.inject(BookService);
    TestBed.flushEffects();

    await vi.waitFor(() => expect(seedLocalSampleDataSpy).toHaveBeenCalledOnce());
    await service.syncFromRemote();

    expect(service['permissionService'].role()).toBe('admin');
    expect(getBooksSpy).not.toHaveBeenCalled();
  });

  it('persists book changes without POSTing in LocalSampleData mode', async () => {
    TestBed.inject(ConfigService).setLocalSampleDataEnabled(true);
    const service = TestBed.inject(BookService);

    await service.saveItem(
      {
        id: 'local-book-entry',
        subject: 'Knowledge',
        topic: 'Local',
        name: 'Local entry',
        author: 'Local user',
        isbn: '',
        language: 'English',
        active: true,
        page: 0,
        pages: 0,
        count: 0,
        row: 0,
      },
      false,
    );

    expect(createBookSpy).not.toHaveBeenCalled();
    expect(service.items()[0]).toMatchObject({ row: 1, syncStatus: 'synced' });
  });

  it('clones books from a public sheet through the book repository', async () => {
    cloneBooksSpy.mockReturnValue(of({ status: 'success' }));
    getBooksSpy.mockReturnValue(
      of({ status: 'success', timestamp: '2026-01-01T00:00:00.000Z', data: { rows: [], totalPages: 0 } }),
    );
    idToken.set('valid-token');
    const service = TestBed.inject(BookService);

    const imported = await service.addBookFromSheet(
      'https://docs.google.com/spreadsheets/d/sheet-id/edit',
    );

    expect(imported).toBe(true);
    expect(cloneBooksSpy).toHaveBeenCalledWith('https://docs.google.com/spreadsheets/d/sheet-id/edit');
    expect(clearAllTablesSpy).toHaveBeenCalled();
  });

  it('clones a single sheet into an existing book and refreshes the entries', async () => {
    const service = TestBed.inject(BookService);
    await service.loadFromLocal();
    idToken.set('valid-token');
    const existing = {
      id: 'existing', row: 1, isbn: '', name: 'Existing Book', author: 'Owner', language: 'English', subject: 'Literature',
      topic: 'Memory', active: true, page: 0, pages: 100, count: 0, updatedAt: '',
    };
    const cloned = { ...existing, id: 'cloned', row: 2, name: 'Cloned Book' };
    service.items.set([existing]);
    cloneBookItemSpy.mockReturnValue(of({ status: 'success' }));
    getBooksSpy.mockReturnValue(of({ status: 'success', data: { rows: [existing, cloned], totalPages: 1 } }));
    const result = await service.cloneBookItemFromSheet('https://docs.google.com/spreadsheets/d/source-id/edit');
    expect(result).toBe(true);
    expect(cloneBookItemSpy).toHaveBeenCalledExactlyOnceWith('https://docs.google.com/spreadsheets/d/source-id/edit');
    expect(cloneBooksSpy).not.toHaveBeenCalled();
    expect(createBookSpy).not.toHaveBeenCalled();
    expect(service.items().map((entry) => entry.id)).toEqual(['existing', 'cloned']);
    expect(service.isLoading()).toBe(false);
  });

  it('keeps the existing book and reports backend clone errors', async () => {
    const service = TestBed.inject(BookService);
    await service.loadFromLocal();
    idToken.set('valid-token');
    cloneBookItemSpy.mockReturnValue(of({ status: 'error', message: 'Cannot access this sheet.' }));
    expect(await service.cloneBookItemFromSheet('https://docs.google.com/spreadsheets/d/source-id/edit')).toBe(false);
    expect(service.errorMessage()).toBe('Cannot access this sheet.');
    expect(service.isLoading()).toBe(false);
    expect(getBooksSpy).not.toHaveBeenCalled();
  });

  it('reports clone transport errors without sending a manual create request', async () => {
    const service = TestBed.inject(BookService);
    await service.loadFromLocal();
    idToken.set('valid-token');
    cloneBookItemSpy.mockReturnValue(throwError(() => new Error('Request timed out.')));
    expect(await service.cloneBookItemFromSheet('https://docs.google.com/spreadsheets/d/source-id/edit')).toBe(false);
    expect(service.errorMessage()).toBe('Request timed out.');
    expect(createBookSpy).not.toHaveBeenCalled();
    expect(service.isLoading()).toBe(false);
  });

  it('distinguishes an already-cloned sheet from a failed book refresh', async () => {
    const service = TestBed.inject(BookService);
    await service.loadFromLocal();
    idToken.set('valid-token');
    cloneBookItemSpy.mockReturnValue(of({ status: 'success' }));
    getBooksSpy.mockReturnValue(throwError(() => new Error('Refresh failed.')));
    expect(await service.cloneBookItemFromSheet('https://docs.google.com/spreadsheets/d/source-id/edit')).toBe(false);
    expect(service.errorMessage()).toBe('BOOK.ERRORS.cloneItemRefreshFailed');
  });

  it('prevents a second source clone while one is pending', async () => {
    const service = TestBed.inject(BookService);
    await service.loadFromLocal();
    idToken.set('valid-token');
    const response = new Subject<{ status: string }>();
    cloneBookItemSpy.mockReturnValue(response);
    getBooksSpy.mockReturnValue(of({ status: 'success', data: { rows: [], totalPages: 0 } }));
    const first = service.cloneBookItemFromSheet('https://docs.google.com/spreadsheets/d/source-id/edit');
    expect(await service.cloneBookItemFromSheet('https://docs.google.com/spreadsheets/d/source-id/edit')).toBe(false);
    expect(cloneBookItemSpy).toHaveBeenCalledTimes(1);
    response.next({ status: 'success' });
    response.complete();
    expect(await first).toBe(true);
  });

  it('does not clone individual sources without authentication or in sample mode', async () => {
    const service = TestBed.inject(BookService);
    await service.loadFromLocal();
    expect(await service.cloneBookItemFromSheet('https://docs.google.com/spreadsheets/d/source-id/edit')).toBe(false);
    expect(service.errorMessage()).toBe('BOOK.ERRORS.authRequired');
    idToken.set('valid-token');
    TestBed.inject(ConfigService).setLocalSampleDataEnabled(true);
    expect(await service.cloneBookItemFromSheet('https://docs.google.com/spreadsheets/d/source-id/edit')).toBe(false);
    expect(service.errorMessage()).toBe('BOOK.ERRORS.cloneItemUnavailable');
    expect(cloneBookItemSpy).not.toHaveBeenCalled();
  });

  it('does not request a book copy in LocalSampleData mode', async () => {
    TestBed.inject(ConfigService).setLocalSampleDataEnabled(true);
    const service = TestBed.inject(BookService);

    const result = await service.addBookFromSheet(
      'https://docs.google.com/spreadsheets/d/sheet-id/edit',
    );

    expect(result).toBe(false);
    expect(cloneBooksSpy).not.toHaveBeenCalled();
  });

  it('does not request a book copy when book items already exist', async () => {
    const service = TestBed.inject(BookService);
    service.items.set([
      {
        id: 'existing',
        subject: 'Knowledge',
        topic: 'Existing',
        name: 'Existing book',
        author: 'Owner',
        isbn: '',
        language: 'English',
        active: true,
        page: 0,
        pages: 100,
        count: 0,
        row: 1,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const result = await service.addBookFromSheet(
      'https://docs.google.com/spreadsheets/d/sheet-id/edit',
    );

    expect(result).toBe(false);
    expect(cloneBooksSpy).not.toHaveBeenCalled();
  });
});
