// @vitest-environment jsdom

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, Subject, throwError } from 'rxjs';
import { AppDbService } from '../../../core/services/storage/app-db.service';
import { ConfigService } from '../../../core/services/config.service';
import { CatalogApiService } from './catalog-api.service';
import { CatalogService } from './catalog.service';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';

describe('CatalogService', () => {
  let logoutSpy: ReturnType<typeof vi.fn>;
  let getCatalogSpy: ReturnType<typeof vi.fn>;
  let idToken: ReturnType<typeof signal<string | null>>;
  let catalogsToArray: ReturnType<typeof vi.fn>;
  let bulkPutSpy: ReturnType<typeof vi.fn>;
  let clearAllTablesSpy: ReturnType<typeof vi.fn>;
  let saveCatalogItemSpy: ReturnType<typeof vi.fn>;
  let copyCatalogSpy: ReturnType<typeof vi.fn>;
  let cloneCatalogItemSpy: ReturnType<typeof vi.fn>;
  let seedLocalSampleDataSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    logoutSpy = vi.fn();
    idToken = signal<string | null>(null);
    catalogsToArray = vi.fn().mockResolvedValue([]);
    bulkPutSpy = vi.fn().mockResolvedValue(undefined);
    clearAllTablesSpy = vi.fn().mockResolvedValue(undefined);
    saveCatalogItemSpy = vi.fn();
    copyCatalogSpy = vi.fn();
    cloneCatalogItemSpy = vi.fn();
    seedLocalSampleDataSpy = vi.fn().mockResolvedValue(undefined);
    getCatalogSpy = vi.fn().mockReturnValue(
      of({
        status: 'error',
        message: 'Error: Authentication error: Invalid or expired Google token.',
      })
    );

    TestBed.configureTestingModule({
      providers: [
        CatalogService,
        {
          provide: AppDbService,
          useValue: {
            clearAllTables: clearAllTablesSpy,
            seedLocalSampleData: seedLocalSampleDataSpy,
            db: {
              transaction: async (_mode: string, _table: unknown, operation: () => Promise<void>) => operation(),
              catalogs: {
                toArray: catalogsToArray,
                clear: vi.fn().mockResolvedValue(undefined),
                bulkPut: bulkPutSpy,
                put: vi.fn().mockResolvedValue(undefined),
                delete: vi.fn().mockResolvedValue(undefined),
              },
            },
          },
        },
        {
          provide: CatalogApiService,
          useValue: {
            getCatalog: getCatalogSpy,
            saveCatalogItem: saveCatalogItemSpy,
            copyCatalog: copyCatalogSpy,
            cloneCatalogItem: cloneCatalogItemSpy,
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
    const service = TestBed.inject(CatalogService);

    await service.syncFromRemote();

    expect(logoutSpy).toHaveBeenCalled();
  });

  it('clears the catalog and all domain tables when the remote catalog is empty', async () => {
    idToken.set('valid-token');
    getCatalogSpy.mockReturnValue(
      of({
        status: 'success',
        timestamp: '2026-01-01T00:00:00.000Z',
        data: [],
      }),
    );
    const service = TestBed.inject(CatalogService);

    await service.syncFromRemote();

    expect(clearAllTablesSpy).toHaveBeenCalledOnce();
    expect(service.items()).toEqual([]);
    expect(service.errorMessage()).toBeNull();
  });

  it('does not seed fabricated records when the local catalog is empty', async () => {
    const service = TestBed.inject(CatalogService);

    await service.loadFromLocal();

    expect(service.items()).toEqual([]);
    expect(bulkPutSpy).not.toHaveBeenCalled();
  });

  it('reports loading while the initial IndexedDB catalog read is pending', async () => {
    let resolveLocal: ((items: unknown[]) => void) | undefined;
    catalogsToArray.mockImplementation(
      () =>
        new Promise<unknown[]>((resolve) => {
          resolveLocal = resolve;
        }),
    );

    const service = TestBed.inject(CatalogService);
    await Promise.resolve();

    expect(service.isLoading()).toBe(true);

    resolveLocal?.([]);
    await Promise.resolve();
    expect(service.isLoading()).toBe(false);
  });

  it('gets the catalog after authentication changes the token signal', async () => {
    TestBed.inject(CatalogService);

    idToken.set('valid-token');
    TestBed.flushEffects();
    await Promise.resolve();

    expect(getCatalogSpy).toHaveBeenCalled();
  });

  it('loads local sample data and skips catalog requests when enabled', async () => {
    const configService = TestBed.inject(ConfigService);
    configService.setLocalSampleDataEnabled(true);
    idToken.set('valid-token');
    const service = TestBed.inject(CatalogService);
    TestBed.flushEffects();

    await vi.waitFor(() => expect(seedLocalSampleDataSpy).toHaveBeenCalledOnce());
    await service.syncFromRemote();

    expect(service['permissionService'].role()).toBe('admin');
    expect(getCatalogSpy).not.toHaveBeenCalled();
  });

  it('persists catalog changes without POSTing in LocalSampleData mode', async () => {
    TestBed.inject(ConfigService).setLocalSampleDataEnabled(true);
    const service = TestBed.inject(CatalogService);

    await service.saveItem(
      {
        id: 'local-catalog-entry',
        subject: 'Knowledge',
        topic: 'Local',
        name: 'Local entry',
        author: 'Local user',
        active: true,
        count: 0,
        row: 0,
      },
      false,
    );

    expect(saveCatalogItemSpy).not.toHaveBeenCalled();
    expect(service.items()[0]).toMatchObject({ row: 1, syncStatus: 'synced' });
  });

  it('clones a public catalog using only the CLONE_CATALOG action and SheetId', async () => {
    copyCatalogSpy.mockReturnValue(of({ status: 'success' }));
    getCatalogSpy.mockReturnValue(
      of({ status: 'success', timestamp: '2026-01-01T00:00:00.000Z', data: [] }),
    );
    idToken.set('valid-token');
    const service = TestBed.inject(CatalogService);

    const imported = await service.addCatalogFromSheet(
      'https://docs.google.com/spreadsheets/d/sheet-id/edit',
    );

    expect(imported).toBe(true);
    expect(copyCatalogSpy).toHaveBeenCalledWith({
      action: 'CLONE_CATALOG',
      SheetId: 'https://docs.google.com/spreadsheets/d/sheet-id/edit',
    });
    expect(clearAllTablesSpy).toHaveBeenCalled();
  });

  it('clones a single sheet into an existing catalog and refreshes the entries', async () => {
    const service = TestBed.inject(CatalogService);
    await service.loadFromLocal();
    idToken.set('valid-token');
    const existing = {
      id: 'existing', row: 1, name: 'Existing Book', author: 'Owner', subject: 'Literature',
      topic: 'Memory', active: true, count: 0, updatedAt: '',
    };
    const cloned = { ...existing, id: 'cloned', row: 2, name: 'Cloned Book' };
    service.items.set([existing]);
    cloneCatalogItemSpy.mockReturnValue(of({ status: 'success' }));
    getCatalogSpy.mockReturnValue(of({ status: 'success', data: [existing, cloned] }));
    const result = await service.cloneCatalogItemFromSheet('https://docs.google.com/spreadsheets/d/source-id/edit');
    expect(result).toBe(true);
    expect(cloneCatalogItemSpy).toHaveBeenCalledExactlyOnceWith({
      action: 'CLONE_CATALOG_ITEM', SheetId: 'https://docs.google.com/spreadsheets/d/source-id/edit',
    });
    expect(copyCatalogSpy).not.toHaveBeenCalled();
    expect(saveCatalogItemSpy).not.toHaveBeenCalled();
    expect(service.items().map((entry) => entry.id)).toEqual(['existing', 'cloned']);
    expect(service.isLoading()).toBe(false);
  });

  it('keeps the existing catalog and reports backend clone errors', async () => {
    const service = TestBed.inject(CatalogService);
    await service.loadFromLocal();
    idToken.set('valid-token');
    cloneCatalogItemSpy.mockReturnValue(of({ status: 'error', message: 'Cannot access this sheet.' }));
    expect(await service.cloneCatalogItemFromSheet('https://docs.google.com/spreadsheets/d/source-id/edit')).toBe(false);
    expect(service.errorMessage()).toBe('Cannot access this sheet.');
    expect(service.isLoading()).toBe(false);
    expect(getCatalogSpy).not.toHaveBeenCalled();
  });

  it('reports clone transport errors without sending a manual create request', async () => {
    const service = TestBed.inject(CatalogService);
    await service.loadFromLocal();
    idToken.set('valid-token');
    cloneCatalogItemSpy.mockReturnValue(throwError(() => new Error('Request timed out.')));
    expect(await service.cloneCatalogItemFromSheet('https://docs.google.com/spreadsheets/d/source-id/edit')).toBe(false);
    expect(service.errorMessage()).toBe('Request timed out.');
    expect(saveCatalogItemSpy).not.toHaveBeenCalled();
    expect(service.isLoading()).toBe(false);
  });

  it('distinguishes an already-cloned sheet from a failed catalog refresh', async () => {
    const service = TestBed.inject(CatalogService);
    await service.loadFromLocal();
    idToken.set('valid-token');
    cloneCatalogItemSpy.mockReturnValue(of({ status: 'success' }));
    getCatalogSpy.mockReturnValue(throwError(() => new Error('Refresh failed.')));
    expect(await service.cloneCatalogItemFromSheet('https://docs.google.com/spreadsheets/d/source-id/edit')).toBe(false);
    expect(service.errorMessage()).toBe('CATALOG.ERRORS.cloneItemRefreshFailed');
  });

  it('prevents a second source clone while one is pending', async () => {
    const service = TestBed.inject(CatalogService);
    await service.loadFromLocal();
    idToken.set('valid-token');
    const response = new Subject<{ status: string }>();
    cloneCatalogItemSpy.mockReturnValue(response);
    getCatalogSpy.mockReturnValue(of({ status: 'success', data: [] }));
    const first = service.cloneCatalogItemFromSheet('https://docs.google.com/spreadsheets/d/source-id/edit');
    expect(await service.cloneCatalogItemFromSheet('https://docs.google.com/spreadsheets/d/source-id/edit')).toBe(false);
    expect(cloneCatalogItemSpy).toHaveBeenCalledTimes(1);
    response.next({ status: 'success' });
    response.complete();
    expect(await first).toBe(true);
  });

  it('does not clone individual sources without authentication or in sample mode', async () => {
    const service = TestBed.inject(CatalogService);
    await service.loadFromLocal();
    expect(await service.cloneCatalogItemFromSheet('https://docs.google.com/spreadsheets/d/source-id/edit')).toBe(false);
    expect(service.errorMessage()).toBe('CATALOG.ERRORS.authRequired');
    idToken.set('valid-token');
    TestBed.inject(ConfigService).setLocalSampleDataEnabled(true);
    expect(await service.cloneCatalogItemFromSheet('https://docs.google.com/spreadsheets/d/source-id/edit')).toBe(false);
    expect(service.errorMessage()).toBe('CATALOG.ERRORS.cloneItemUnavailable');
    expect(cloneCatalogItemSpy).not.toHaveBeenCalled();
  });

  it('does not request a catalog copy in LocalSampleData mode', async () => {
    TestBed.inject(ConfigService).setLocalSampleDataEnabled(true);
    const service = TestBed.inject(CatalogService);

    const result = await service.addCatalogFromSheet(
      'https://docs.google.com/spreadsheets/d/sheet-id/edit',
    );

    expect(result).toBe(false);
    expect(copyCatalogSpy).not.toHaveBeenCalled();
  });

  it('does not request a catalog copy when catalog items already exist', async () => {
    const service = TestBed.inject(CatalogService);
    service.items.set([
      {
        id: 'existing',
        subject: 'Knowledge',
        topic: 'Existing',
        name: 'Existing catalog',
        author: 'Owner',
        active: true,
        count: 0,
        row: 1,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const result = await service.addCatalogFromSheet(
      'https://docs.google.com/spreadsheets/d/sheet-id/edit',
    );

    expect(result).toBe(false);
    expect(copyCatalogSpy).not.toHaveBeenCalled();
  });
});
