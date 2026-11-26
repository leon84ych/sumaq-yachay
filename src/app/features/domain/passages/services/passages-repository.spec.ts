import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { PassageGASMapper } from '../model/passages-gas.mapper';
import { PassageRaw, PassageRecord } from '../model/passages-model';
import { PassageGASRepository } from './passages-gas-repository';
import { PassageQueryService } from './passages-query.service';
import { PassageRepository } from './passages-repository';

const storageKey = (bookId: string, id: string): string => `${bookId}|${id}`;

class FakePassagesTable {
  readonly rows = new Map<string, PassageRecord>();

  async bulkGet(keys: [string, string][]): Promise<(PassageRecord | undefined)[]> {
    return keys.map(([bookId, id]) => this.rows.get(storageKey(bookId, id)));
  }

  async put(record: PassageRecord): Promise<void> {
    this.rows.set(storageKey(record.bookId, record.id), { ...record });
  }

  async bulkPut(records: PassageRecord[]): Promise<void> {
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
        toArray: async () =>
          [...this.rows.values()].filter(
            (row) => (row as Record<string, unknown>)[field] === value,
          ),
      }),
    };
  }
}

const record: PassageRecord = {
  id: 'temp-1',
  bookId: 'book-1',
  bookRow: 7,
  itemRow: 0,
  title: 'A title',
  passageText: 'A long passage',
  book: 'A book',
  author: 'An author',
  page: '',
  tags: ['#one'],
  syncStatus: 'pending',
  contributor: '',
  feed: 5,
};

describe('PassageRepository', () => {
  const passages = new FakePassagesTable();
  const gasRepository = {
    getDomain: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  const books = {
    where: () => ({ equals: () => ({ first: async () => ({ id: 'book-1', row: 7 }) }) }),
  };
  let repository: PassageRepository;
  let query: PassageQueryService;

  beforeEach(() => {
    passages.rows.clear();
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: PassageGASRepository, useValue: gasRepository },
        {
          provide: LocalDBService,
          useValue: {
            indexedDB: {
              passages,
              books,
              tags: {},
              transaction: (_mode: string, _table: unknown, work: () => Promise<void>) => work(),
            },
          },
        },
      ],
    });
    repository = TestBed.inject(PassageRepository);
    query = TestBed.inject(PassageQueryService);
  });

  it('persists fetched rows, filling bookRow from the fetch argument and bookId from the book', async () => {
    const mapper = new PassageGASMapper();
    const raw: PassageRaw = {
      ...mapper.toRaw({ ...record, id: 'p-1', itemRow: 15, tags: ['#one'] }),
      bookId: '',
      bookRow: undefined as unknown as number,
    };
    gasRepository.getDomain.mockResolvedValue([raw]);

    const result = await repository.getDomain(7);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'p-1', bookId: 'book-1', bookRow: 7, itemRow: 15 });
    expect(await query.getPassagesByBookId('book-1')).toHaveLength(1);
    expect(await query.getPassagesByBookId('other-book')).toHaveLength(0);
  });

  it('writes pending first, then replaces the temporary id with the GAS id on create', async () => {
    gasRepository.addDomainItem.mockImplementation(async () => {
      expect(passages.rows.get(storageKey('book-1', 'temp-1'))?.syncStatus).toBe('pending');
      return { ...record, id: 'gas-id', syncStatus: 'synced' };
    });

    const saved = await repository.addDomainItem(record);

    expect(saved.id).toBe('gas-id');
    expect(passages.rows.has(storageKey('book-1', 'temp-1'))).toBe(false);
    expect(passages.rows.get(storageKey('book-1', 'gas-id'))?.syncStatus).toBe('synced');
  });

  it('keeps an error record when create fails', async () => {
    gasRepository.addDomainItem.mockRejectedValue(new Error('boom'));

    await expect(repository.addDomainItem(record)).rejects.toThrow('boom');

    expect(passages.rows.get(storageKey('book-1', 'temp-1'))?.syncStatus).toBe('error');
  });

  it('stores the synced result on update and marks error on failure', async () => {
    const existing = { ...record, id: 'p-1', itemRow: 15 };
    gasRepository.updateDomainItem.mockResolvedValueOnce({ ...existing, syncStatus: 'synced' });

    await repository.updateDomainItem(existing);
    expect(passages.rows.get(storageKey('book-1', 'p-1'))?.syncStatus).toBe('synced');

    gasRepository.updateDomainItem.mockRejectedValueOnce(new Error('boom'));
    await expect(repository.updateDomainItem(existing)).rejects.toThrow('boom');
    expect(passages.rows.get(storageKey('book-1', 'p-1'))?.syncStatus).toBe('error');
  });

  it('deletes locally only after GAS succeeds', async () => {
    const existing = { ...record, id: 'p-1', itemRow: 15, syncStatus: 'synced' as const };
    await passages.put(existing);

    gasRepository.deleteDomainItem.mockRejectedValueOnce(new Error('boom'));
    await expect(repository.deleteDomainItem(existing)).rejects.toThrow('boom');
    expect(passages.rows.has(storageKey('book-1', 'p-1'))).toBe(true);

    gasRepository.deleteDomainItem.mockResolvedValueOnce(undefined);
    await repository.deleteDomainItem(existing);
    expect(gasRepository.deleteDomainItem).toHaveBeenLastCalledWith(existing);
    expect(passages.rows.has(storageKey('book-1', 'p-1'))).toBe(false);
  });
});
