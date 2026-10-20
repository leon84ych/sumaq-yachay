import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { ConfigService } from '../../../core/services/config.service';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';
import { DomainDataApiService } from './domain-data-api.service';
import { PermissionService } from '../../../core/services/permission.service';

describe('DomainDataApiService.deleteRow', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let getWebAppUrl: ReturnType<typeof vi.fn>;
  let idToken: ReturnType<typeof vi.fn>;
  let localSampleDataEnabled: boolean;

  beforeEach(() => {
    getWebAppUrl = vi.fn(() => 'https://example.com/gas');
    idToken = vi.fn(() => 'auth-token');
    localSampleDataEnabled = false;
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ status: 'success' }),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchSpy);

    TestBed.configureTestingModule({
      providers: [
        DomainDataApiService,
        {
          provide: ConfigService,
          useValue: { getWebAppUrl, isLocalSampleDataEnabled: () => localSampleDataEnabled },
        },
        { provide: GoogleAuthService, useValue: { idToken } },
        { provide: TranslocoService, useValue: { translate: (key: string) => key } },
      ],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('sends the authenticated DELETE_ROW payload using the GAS CORS content type', async () => {
    const service = TestBed.inject(DomainDataApiService);

    await firstValueFrom(service.deleteRow(3, 'CONCEPTS', 'concept-7', 'catalog-item-3'));

    expect(fetchSpy).toHaveBeenCalledWith('https://example.com/gas', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'DELETE_ROW',
        idToken: 'auth-token',
        bookId: 'catalog-item-3',
        row: 3,
        sheetName: 'CONCEPTS',
        id: 'concept-7',
      }),
    });
  });

  it('sends the parent CatalogItem.id in the UPDATE_SHEET_ROWS payload', async () => {
    const service = TestBed.inject(DomainDataApiService);
    const rows = [{ id: 'concept-row-9', term: 'Context' }];

    await firstValueFrom(service.updateRows(3, 'CONCEPTS', rows, 'catalog-item-3'));

    expect(fetchSpy).toHaveBeenCalledWith('https://example.com/gas', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'UPDATE_SHEET_ROWS',
        row: 3,
        id: 'catalog-item-3',
        sheetName: 'CONCEPTS',
        rows,
        idToken: 'auth-token',
      }),
    });
  });

  it('creates only the supplied row without its local id and returns the GAS id', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        status: 'success',
        data: { id: 'gas-row-9' },
      }),
    } as unknown as Response);
    const service = TestBed.inject(DomainDataApiService);
    const newRow = { id: 'temporary-local-id', term: 'New term', tag: '#valid' };

    const response = await firstValueFrom(
      service.updateRows(3, 'CONCEPTS', [newRow], 'catalog-item-3', true),
    );

    expect(fetchSpy).toHaveBeenCalledWith('https://example.com/gas', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'UPDATE_SHEET_ROWS',
        row: 3,
        id: 'catalog-item-3',
        sheetName: 'CONCEPTS',
        rows: [{ term: 'New term', tag: '#valid' }],
        idToken: 'auth-token',
      }),
    });
    expect(response.createdRowId).toBe('gas-row-9');
  });

  it('rejects UPDATE_SHEET_ROWS when GAS reports an error', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ status: 'error', message: 'Write rejected.' }),
    } as unknown as Response);
    const service = TestBed.inject(DomainDataApiService);

    await expect(
      firstValueFrom(service.updateRows(3, 'CONCEPTS', [], 'catalog-item-3')),
    ).rejects.toThrow('Write rejected.');
  });

  it('rejects the request when there is no authentication token', async () => {
    idToken.mockReturnValue(null);
    const service = TestBed.inject(DomainDataApiService);

    await expect(
      firstValueFrom(service.deleteRow(3, 'CONCEPTS', 'concept-7', 'catalog-item-3')),
    ).rejects.toThrow('CATALOG_DETAIL.ERRORS.AUTHENTICATION_REQUIRED_DELETE');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('updates the central role signal from the backend response', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        status: 'success',
        role: 'admin',
        data: { status: 'success', sheets: [] },
      }),
    } as unknown as Response);

    const service = TestBed.inject(DomainDataApiService);
    const permissions = TestBed.inject(PermissionService);

    await firstValueFrom(service.getDomainSheets(3));

    expect(permissions.role()).toBe('admin');
  });

  it('blocks domain HTTP requests in LocalSampleData mode', async () => {
    localSampleDataEnabled = true;
    const service = TestBed.inject(DomainDataApiService);

    await expect(
      firstValueFrom(service.getDomainSheets(3)),
    ).rejects.toThrow('Remote requests are disabled in LocalSampleData mode.');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
