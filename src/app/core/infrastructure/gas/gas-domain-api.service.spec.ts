import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslocoService } from '@jsverse/transloco';
import { GASDomainAPI } from './gas-domain-api.service';
import { TOKEN_KEY } from './gas-constants.constants';

describe('GASDomainAPI row payloads', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let api: GASDomainAPI<unknown, unknown>;

  const bodyOfLastCall = (): Record<string, unknown> =>
    JSON.parse(fetchSpy.mock.calls.at(-1)?.[1].body as string) as Record<string, unknown>;

  beforeEach(() => {
    localStorage.setItem(TOKEN_KEY, 'auth-token');
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ status: 'success', data: { id: 'gas-id' } }),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchSpy);

    TestBed.configureTestingModule({
      providers: [{ provide: TranslocoService, useValue: { translate: (key: string) => key } }],
    });
    api = TestBed.inject(GASDomainAPI);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.removeItem(TOKEN_KEY);
    TestBed.resetTestingModule();
  });

  it('sends CREATE_ROW with the book row and a row object without id/bookId', async () => {
    const id = await api.addDomainItem(7, 'book-1', 'QUOTES', {
      id: 'temp',
      bookId: 'book-1',
      itemRow: 0,
      quote: 'A quote',
    });

    expect(id).toBe('gas-id');
    expect(bodyOfLastCall()).toEqual({
      action: 'CREATE_ROW',
      id: 'book-1',
      row: 7,
      sheetName: 'QUOTES',
      rows: [{ itemRow: 0, quote: 'A quote' }],
      idToken: 'auth-token',
    });
  });

  it('sends UPDATE_ROW with rowId and never CREATE_ROW', async () => {
    await api.updateDomainItem(7, 'book-1', 'QUOTES', 'quote-1', {
      id: 'quote-1',
      bookId: 'book-1',
      itemRow: 15,
      quote: 'Edited',
    });

    expect(bodyOfLastCall()).toEqual({
      action: 'UPDATE_ROW',
      id: 'book-1',
      row: 7,
      sheetName: 'QUOTES',
      rowId: 'quote-1',
      rows: [{ itemRow: 15, quote: 'Edited' }],
      idToken: 'auth-token',
    });
  });

  it('sends DELETE_ROW with bookRow and itemRow as distinct fields', async () => {
    await api.deleteDomainItem(7, 'book-1', 'QUOTES', 'quote-1', 15);

    expect(bodyOfLastCall()).toEqual({
      action: 'DELETE_ROW',
      idToken: 'auth-token',
      bookId: 'book-1',
      bookRow: 7,
      sheetName: 'QUOTES',
      itemId: 'quote-1',
      itemRow: 15,
    });
  });

  it('reads pages using the bookRow query parameter', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ status: 'success', data: { rows: [] } }),
    } as unknown as Response);

    await api.getDomainPaginated(7, 'QUOTES', 2, 50);

    const url = new URL(fetchSpy.mock.calls.at(-1)?.[0] as string);
    expect(url.searchParams.get('action')).toBe('GET_PAGINATED_ROWS');
    expect(url.searchParams.get('bookRow')).toBe('7');
    expect(url.searchParams.get('sheetName')).toBe('QUOTES');
    expect(url.searchParams.get('page')).toBe('2');
  });
});
