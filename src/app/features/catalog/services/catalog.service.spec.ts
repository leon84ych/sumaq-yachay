// @vitest-environment jsdom

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
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
              catalogs: {
                toArray: catalogsToArray,
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
