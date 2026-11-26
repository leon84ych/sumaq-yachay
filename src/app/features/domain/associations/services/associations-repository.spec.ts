import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { AssociationGASMapper } from '../model/associations-gas.mapper';
import { AssociationRaw, AssociationRecord } from '../model/associations-model';
import { AssociationGASRepository } from './associations-gas-repository';
import { AssociationQueryService } from './associations-query.service';
import { AssociationRepository } from './associations-repository';

const storageKey = (bookId: string, id: string): string => `${bookId}|${id}`;

class FakeAssociationsTable {
  readonly rows = new Map<string, AssociationRecord>();

  async bulkGet(keys: [string, string][]): Promise<(AssociationRecord | undefined)[]> {
    return keys.map(([bookId, id]) => this.rows.get(storageKey(bookId, id)));
  }

  async put(record: AssociationRecord): Promise<void> {
    this.rows.set(storageKey(record.bookId, record.id), { ...record });
  }

  async bulkPut(records: AssociationRecord[]): Promise<void> {
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

const record: AssociationRecord = {
  id: 'temp-1',
  bookId: 'book-1',
  bookRow: 8,
  itemRow: 0,
  sourceConceptId: 'concept-a',
  targetConceptId: 'concept-b',
  relationType: 'causes',
  directed: true,
  description: 'One concept gives rise to the other.',
  color: '#735D78',
  book: 'Book One',
  author: 'Author One',
  page: '',
  tags: ['#causality'],
  feed: 5,
  contributor: '',
  syncStatus: 'pending',
};

describe('AssociationRepository', () => {
  const associations = new FakeAssociationsTable();
  const gasRepository = {
    getDomain: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  const books = {
    where: () => ({ equals: () => ({ first: async () => ({ id: 'book-1', row: 8 }) }) }),
  };
  let repository: AssociationRepository;
  let query: AssociationQueryService;

  beforeEach(() => {
    associations.rows.clear();
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: AssociationGASRepository, useValue: gasRepository },
        {
          provide: LocalDBService,
          useValue: {
            indexedDB: {
              associations,
              books,
              tags: {},
              transaction: (_mode: string, _table: unknown, work: () => Promise<void>) => work(),
            },
          },
        },
      ],
    });
    repository = TestBed.inject(AssociationRepository);
    query = TestBed.inject(AssociationQueryService);
  });

  it('maps and persists fetched rows with the fetch bookRow and owning bookId', async () => {
    const mapper = new AssociationGASMapper();
    const raw: AssociationRaw = {
      ...mapper.toRaw({ ...record, id: 'association-1', itemRow: 24 }),
      bookId: '',
      bookRow: 0,
    };
    gasRepository.getDomain.mockResolvedValue([raw]);

    const result = await repository.getDomain(8);

    expect(result[0]).toMatchObject({ bookId: 'book-1', bookRow: 8, itemRow: 24 });
    expect(await query.getAssociationsByBookId('book-1')).toHaveLength(1);
    expect(await query.getAssociationsByBookId('other-book')).toHaveLength(0);
  });

  it('replaces the temporary ID after a successful create', async () => {
    gasRepository.addDomainItem.mockImplementation(async () => {
      expect(associations.rows.get(storageKey('book-1', 'temp-1'))?.syncStatus).toBe('pending');
      return { ...record, id: 'gas-id', syncStatus: 'synced' };
    });

    const saved = await repository.addDomainItem(record);

    expect(saved.id).toBe('gas-id');
    expect(associations.rows.has(storageKey('book-1', 'temp-1'))).toBe(false);
    expect(associations.rows.get(storageKey('book-1', 'gas-id'))?.syncStatus).toBe('synced');
  });

  it('retains an error record when a create fails', async () => {
    gasRepository.addDomainItem.mockRejectedValue(new Error('boom'));

    await expect(repository.addDomainItem(record)).rejects.toThrow('boom');

    expect(associations.rows.get(storageKey('book-1', 'temp-1'))?.syncStatus).toBe('error');
  });

  it('deletes locally only after the remote delete succeeds', async () => {
    const existing = {
      ...record,
      id: 'association-1',
      itemRow: 24,
      syncStatus: 'synced' as const,
    };
    await associations.put(existing);

    gasRepository.deleteDomainItem.mockRejectedValueOnce(new Error('boom'));
    await expect(repository.deleteDomainItem(existing)).rejects.toThrow('boom');
    expect(associations.rows.has(storageKey('book-1', 'association-1'))).toBe(true);

    gasRepository.deleteDomainItem.mockResolvedValueOnce(undefined);
    await repository.deleteDomainItem(existing);
    expect(associations.rows.has(storageKey('book-1', 'association-1'))).toBe(false);
  });
});
