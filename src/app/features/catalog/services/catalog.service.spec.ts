import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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

  beforeAll(() => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
    logoutSpy = vi.fn();
    idToken = signal<string | null>(null);
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
            db: {
              catalogs: {
                toArray: vi.fn().mockResolvedValue([]),
                clear: vi.fn().mockResolvedValue(undefined),
                bulkPut: vi.fn().mockResolvedValue(undefined),
                put: vi.fn().mockResolvedValue(undefined),
                delete: vi.fn().mockResolvedValue(undefined),
              },
              transaction: vi.fn().mockImplementation(async (_mode: string, _store: unknown, fn: () => Promise<void>) => fn()),
            },
          },
        },
        {
          provide: CatalogApiService,
          useValue: { getCatalog: getCatalogSpy },
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

  it('gets the catalog after authentication changes the token signal', async () => {
    TestBed.inject(CatalogService);

    idToken.set('valid-token');
    TestBed.flushEffects();
    await Promise.resolve();

    expect(getCatalogSpy).toHaveBeenCalled();
  });
});
