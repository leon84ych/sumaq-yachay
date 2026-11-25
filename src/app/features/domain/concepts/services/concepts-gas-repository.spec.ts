import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslocoService } from '@jsverse/transloco';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { TOKEN_KEY } from '../../../../core/infrastructure/gas/gas-constants.constants';
import { ConceptRaw, ConceptRecord } from '../model/concepts-model';
import { ConceptGASRepository } from './concepts-gas-repository';

const record: ConceptRecord = {
  id: 'concept-1',
  bookId: 'book-1',
  bookRow: 7,
  itemRow: 15,
  term: 'Eternal return',
  definition: 'The same life repeats infinitely.',
  category: 'principle-axiom',
  source: 'Zaratustra',
  tags: ['#one', '#two'],
  syncStatus: 'pending',
  contributor: 'admin@example.com',
  feed: 5,
};

describe('ConceptGASRepository', () => {
  const api = {
    getDomainPaginated: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  let repository: ConceptGASRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: GASDomainAPI, useValue: api }],
    });
    repository = TestBed.inject(ConceptGASRepository);
  });

  it('reads the CONCEPTS sheet using the owning book row', async () => {
    const rows: ConceptRaw[] = [];
    api.getDomainPaginated.mockResolvedValue({ data: { rows } });

    await repository.getDomain(7);

    expect(api.getDomainPaginated).toHaveBeenCalledWith(7, 'CONCEPTS', 1, 50);
  });

  it('creates with bookRow as the row and an object-shaped raw row', async () => {
    api.addDomainItem.mockResolvedValue('gas-id');

    const created = await repository.addDomainItem(record);

    expect(api.addDomainItem).toHaveBeenCalledWith(7, 'book-1', 'CONCEPTS', {
      id: 'concept-1',
      bookId: 'book-1',
      bookRow: 7,
      itemRow: 15,
      term: 'Eternal return',
      definition: 'The same life repeats infinitely.',
      category: 'principle-axiom',
      source: 'Zaratustra',
      tags: '#one|#two',
      syncStatus: 'pending',
      contributor: 'admin@example.com',
      feed: 5,
    });
    expect(created).toMatchObject({ id: 'gas-id', syncStatus: 'synced', tags: ['#one', '#two'] });
  });

  it('updates with bookRow, itemRow and itemId inside the row object', async () => {
    api.updateDomainItem.mockResolvedValue(undefined);

    const updated = await repository.updateDomainItem(record);

    expect(api.updateDomainItem).toHaveBeenCalledWith(7, 'book-1', 'CONCEPTS', 'concept-1', {
      id: 'concept-1',
      bookId: 'book-1',
      bookRow: 7,
      itemRow: 15,
      itemId: 'concept-1',
      term: 'Eternal return',
      definition: 'The same life repeats infinitely.',
      category: 'principle-axiom',
      source: 'Zaratustra',
      tags: '#one|#two',
      syncStatus: 'pending',
      contributor: 'admin@example.com',
      feed: 5,
    });
    expect(updated.syncStatus).toBe('synced');
  });

  it('deletes using bookRow for the book and itemRow for the item', async () => {
    api.deleteDomainItem.mockResolvedValue(undefined);

    await repository.deleteDomainItem(record);

    expect(api.deleteDomainItem).toHaveBeenCalledWith(7, 'book-1', 'CONCEPTS', 'concept-1', 15);
  });
});

describe('ConceptGASRepository request bodies', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let repository: ConceptGASRepository;

  const bodyOfLastCall = (): Record<string, unknown> =>
    JSON.parse(fetchSpy.mock.calls.at(-1)?.[1].body as string) as Record<string, unknown>;

  beforeEach(() => {
    localStorage.setItem(TOKEN_KEY, 'auth-token');
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ status: 'success', data: { id: 'gas-id' } }),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchSpy);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: TranslocoService, useValue: { translate: (key: string) => key } }],
    });
    repository = TestBed.inject(ConceptGASRepository);
  });

  it('sends UPDATE_ROW with the item identity in rows and never CREATE_ROW', async () => {
    await repository.updateDomainItem(record);

    const body = bodyOfLastCall();
    expect(body['action']).toBe('UPDATE_ROW');
    expect(body['row']).toBe(7);
    expect(body['sheetName']).toBe('CONCEPTS');
    expect([body['rows']].flat()[0]).toMatchObject({
      bookRow: 7,
      itemRow: 15,
      itemId: 'concept-1',
      term: 'Eternal return',
      category: 'principle-axiom',
      source: 'Zaratustra',
      tags: '#one|#two',
      syncStatus: 'pending',
      contributor: 'admin@example.com',
      feed: 5,
    });
  });

  it('sends DELETE_ROW with row as bookRow, itemRow and itemId as the record id', async () => {
    await repository.deleteDomainItem(record);

    expect(bodyOfLastCall()).toEqual({
      action: 'DELETE_ROW',
      idToken: 'auth-token',
      bookId: 'book-1',
      row: 7,
      sheetName: 'CONCEPTS',
      itemId: 'concept-1',
      itemRow: 15,
    });
  });
});
