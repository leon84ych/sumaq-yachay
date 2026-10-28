import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../../core/services/config.service';
import { PermissionService } from '../../../core/services/permission.service';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';
import { CatalogApiService } from './catalog-api.service';

describe('CatalogApiService clone requests', () => {
  const sheetUrl = 'https://docs.google.com/spreadsheets/d/source-id/edit';
  const response = {
    ok: true,
    json: async () => ({ status: 'success', role: 'admin' }),
  } as Response;
  const fetchRequest = vi.fn();
  let service: CatalogApiService;

  beforeEach(() => {
    localStorage.clear();
    fetchRequest.mockReset().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchRequest);
    TestBed.configureTestingModule({
      providers: [
        { provide: GoogleAuthService, useValue: { idToken: signal('test-token') } },
        { provide: PermissionService, useValue: { setRole: vi.fn() } },
        { provide: TranslocoService, useValue: { translate: (key: string) => key } },
      ],
    });
    TestBed.inject(ConfigService).setWebAppUrl('https://example.com/exec');
    service = TestBed.inject(CatalogApiService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('posts only CLONE_CATALOG, SheetId, and the authentication token', async () => {
    await firstValueFrom(service.copyCatalog({ action: 'CLONE_CATALOG', SheetId: sheetUrl }));
    const [url, options] = fetchRequest.mock.calls[0];
    expect(url).toBe('https://example.com/exec');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      action: 'CLONE_CATALOG',
      SheetId: sheetUrl,
      idToken: 'test-token',
    });
  });

  it('accepts a clone response taking longer than the old six-second timeout', async () => {
    vi.useFakeTimers();
    fetchRequest.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(response), 10_000);
        }),
    );
    const result = firstValueFrom(
      service.copyCatalog({ action: 'CLONE_CATALOG', SheetId: sheetUrl }),
    );
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await result).toEqual({ status: 'success', role: 'admin' });
    expect(fetchRequest.mock.calls[0][1].signal.aborted).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['clone', 'get', 'clone-body', 'get-body'])(
    'aborts a pending %s request at one minute, not earlier',
    async (operation) => {
      vi.useFakeTimers();
      if (operation.endsWith('-body')) {
        fetchRequest.mockResolvedValue({ ok: true, json: () => new Promise(() => {}) });
      } else {
        fetchRequest.mockImplementation(() => new Promise(() => {}));
      }
      const request = operation.startsWith('get')
        ? service.getCatalog()
        : service.copyCatalog({ action: 'CLONE_CATALOG', SheetId: sheetUrl });
      const rejected = expect(firstValueFrom(request)).rejects.toThrow('60000ms');
      const requestSignal: AbortSignal = fetchRequest.mock.calls[0][1].signal;
      await vi.advanceTimersByTimeAsync(59_999);
      expect(requestSignal.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await rejected;
      expect(requestSignal.aborted).toBe(true);
    },
  );
});
