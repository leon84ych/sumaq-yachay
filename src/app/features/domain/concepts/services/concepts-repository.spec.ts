import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { ConceptGASMapper } from '../model/concepts-gas.mapper';
import { ConceptRaw, ConceptRecord } from '../model/concepts-model';
import { ConceptGASRepository } from './concepts-gas-repository';
import { ConceptQueryService } from './concepts-query.service';
import { ConceptRepository } from './concepts-repository';

const storageKey = (bookId: string, id: string): string => `${bookId}|${id}`;

class FakeConceptsTable {
  readonly rows = new Map<string, ConceptRecord>();

  async bulkGet(keys: [string, string][]): Promise<(ConceptRecord | undefined)[]> {
    return keys.map(([bookId, id]) => this.rows.get(storageKey(bookId, id)));
  }

  async put(record: ConceptRecord): Promise<void> {
    this.rows.set(storageKey(record.bookId, record.id), { ...record });
  }

  async bulkPut(records: ConceptRecord[]): Promise<void> {
    for (const record of records) {
      await this.put(record);
    }
  }

  async delete([bookId, id]: [string, string]): Promise<void> {
    this.rows.delete(storageKey(bookId, id));
  }

  where(field: string) {
    return {
      equals: (value: string) => ({
        toArray: async () => [...this.rows.values()].filter((row) => row[field] === value),
      }),
    };
  }
}

const record: ConceptRecord = {
  id: 'temp-1',
  bookId: 'book-1',
  bookRow: 7,
  itemRow: 0,
  term: 'Term',
  definition: 'Definition',
  category: '',
  source: 'Book',
  tags: ['#one'],
  syncStatus: 'pending',
  contributor: '',
  feed: 5,
};

describe('ConceptRepository', () => {
  const concepts = new FakeConceptsTable();
  const gasRepository = {
    getDomain: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  const books = {
    where: () => ({ equals: () => ({ first: async () => ({ id: 'book-1', row: 7 }) }) }),
  };
  let repository: ConceptRepository;
  let query: ConceptQueryService;

  beforeEach(() => {
    concepts.rows.clear();
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: ConceptGASRepository, useValue: gasRepository },
        {
          provide: LocalDBService,
          useValue: {
            indexedDB: {
              concepts,
              books,
              tags: {},
              transaction: (_mode: string, _table: unknown, work: () => Promise<void>) => work(),
            },
          },
        },
      ],
    });
    repository = TestBed.inject(ConceptRepository);
    query = TestBed.inject(ConceptQueryService);
  });

  it('persists fetched rows, filling bookRow from the fetch argument and bookId from the book', async () => {
    const raw: ConceptRaw = {
      ...new ConceptGASMapper().toRaw({ ...record, id: 'c-1', itemRow: 15 }),
      bookId: '',
      bookRow: undefined as unknown as number,
    };
    gasRepository.getDomain.mockResolvedValue([raw]);

    const result = await repository.getDomain(7);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'c-1', bookId: 'book-1', bookRow: 7, itemRow: 15 });
    expect(await query.getConceptsByBookId('book-1')).toHaveLength(1);
    expect(await query.getConceptsByBookId('other-book')).toHaveLength(0);
  });

  it('preserves feed state when refreshing a locally shown row', async () => {
    const lastSeen = new Date('2026-01-02T03:04:05.000Z');
    const lastReview = new Date('2026-01-03T03:04:05.000Z');
    await concepts.put({
      ...record,
      id: 'c-1',
      lastSeen,
      lastReview,
      interval: 8,
      forgotten: 2,
      recalled: 3,
    });
    const raw = new ConceptGASMapper().toRaw({ ...record, id: 'c-1' });
    gasRepository.getDomain.mockResolvedValue([raw]);

    const [refreshed] = await repository.getDomain(7);

    expect(refreshed.lastSeen).toEqual(lastSeen);
    expect(refreshed).toMatchObject({
      lastSeen,
      lastReview,
      interval: 8,
      forgotten: 2,
      recalled: 3,
    });
    expect(concepts.rows.get(storageKey('book-1', 'c-1'))).toMatchObject({
      lastSeen,
      lastReview,
      interval: 8,
      forgotten: 2,
      recalled: 3,
    });
  });

  it('keeps edits and deletions made while a server refresh is in flight', async () => {
    const original = { ...record, id: 'existing', syncStatus: 'synced' as const };
    const deleted = { ...original, id: 'deleted' };
    await concepts.put(original);
    await concepts.put(deleted);
    let finish!: (raws: ConceptRaw[]) => void;
    gasRepository.getDomain.mockReturnValue(new Promise<ConceptRaw[]>((resolve) => { finish = resolve; }));
    const refresh = repository.getDomain(7);
    await vi.waitFor(() => expect(gasRepository.getDomain).toHaveBeenCalledOnce());
    await concepts.put({ ...original, term: 'Local edit', syncStatus: 'pending' });
    await concepts.delete(['book-1', 'deleted']);
    finish([new ConceptGASMapper().toRaw(original), new ConceptGASMapper().toRaw(deleted)]);

    expect(await refresh).toEqual([expect.objectContaining({ id: 'existing', term: 'Local edit' })]);
    expect(concepts.rows.get(storageKey('book-1', 'deleted'))).toBeUndefined();
  });

  it('writes pending first, then replaces the temporary id with the GAS id on create', async () => {
    gasRepository.addDomainItem.mockImplementation(async () => {
      expect(concepts.rows.get(storageKey('book-1', 'temp-1'))?.syncStatus).toBe('pending');
      return { ...record, id: 'gas-id', syncStatus: 'synced' };
    });

    const saved = await repository.addDomainItem(record);

    expect(saved.id).toBe('gas-id');
    expect(concepts.rows.has(storageKey('book-1', 'temp-1'))).toBe(false);
    expect(concepts.rows.get(storageKey('book-1', 'gas-id'))?.syncStatus).toBe('synced');
  });

  it('keeps an error record when create fails', async () => {
    gasRepository.addDomainItem.mockRejectedValue(new Error('boom'));

    await expect(repository.addDomainItem(record)).rejects.toThrow('boom');

    expect(concepts.rows.get(storageKey('book-1', 'temp-1'))?.syncStatus).toBe('error');
  });

  it('stores the synced result on update and marks error on failure', async () => {
    const existing = { ...record, id: 'c-1', itemRow: 15 };
    gasRepository.updateDomainItem.mockResolvedValueOnce({ ...existing, syncStatus: 'synced' });

    await repository.updateDomainItem(existing);
    expect(concepts.rows.get(storageKey('book-1', 'c-1'))?.syncStatus).toBe('synced');

    gasRepository.updateDomainItem.mockRejectedValueOnce(new Error('boom'));
    await expect(repository.updateDomainItem(existing)).rejects.toThrow('boom');
    expect(concepts.rows.get(storageKey('book-1', 'c-1'))?.syncStatus).toBe('error');
  });

  it('deletes locally only after GAS succeeds', async () => {
    const existing = { ...record, id: 'c-1', itemRow: 15, syncStatus: 'synced' as const };
    await concepts.put(existing);

    gasRepository.deleteDomainItem.mockRejectedValueOnce(new Error('boom'));
    await expect(repository.deleteDomainItem(existing)).rejects.toThrow('boom');
    expect(concepts.rows.has(storageKey('book-1', 'c-1'))).toBe(true);

    gasRepository.deleteDomainItem.mockResolvedValueOnce(undefined);
    await repository.deleteDomainItem(existing);
    expect(gasRepository.deleteDomainItem).toHaveBeenLastCalledWith(existing);
    expect(concepts.rows.has(storageKey('book-1', 'c-1'))).toBe(false);
  });
});
