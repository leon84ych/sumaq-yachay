import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppDbService } from '../../../core/services/storage/app-db.service';
import { ConfigService } from '../../../core/services/config.service';
import { CatalogApiService } from './catalog-api.service';
import { CatalogService } from './catalog.service';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';

describe('CatalogService', () => {
  let logoutSpy: jasmine.Spy;
  let getCatalogSpy: jasmine.Spy;

  beforeEach(() => {
    logoutSpy = jasmine.createSpy('logout');
    getCatalogSpy = jasmine.createSpy('getCatalog').and.returnValue(
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
                toArray: jasmine.createSpy('toArray').and.resolveTo([]),
                clear: jasmine.createSpy('clear').and.resolveTo(),
                bulkPut: jasmine.createSpy('bulkPut').and.resolveTo(),
                put: jasmine.createSpy('put').and.resolveTo(),
                delete: jasmine.createSpy('delete').and.resolveTo(),
              },
              transaction: jasmine.createSpy('transaction').and.callFake(async (_mode: string, _store: unknown, fn: () => Promise<void>) => fn()),
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
            idToken: () => 'valid-token',
            logout: logoutSpy,
          },
        },
        {
          provide: ConfigService,
          useValue: {
            useSampleData: () => false,
          },
        },
      ],
    });
  });

  it('logs out the user when Google says the token is invalid or expired', async () => {
    const service = TestBed.inject(CatalogService);

    await service.syncFromRemote();

    expect(logoutSpy).toHaveBeenCalled();
  });
});
