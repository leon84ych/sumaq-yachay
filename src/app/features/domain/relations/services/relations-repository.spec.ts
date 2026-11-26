import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { RelationGASMapper } from '../model/relations-gas.mapper';
import { RelationRaw, RelationRecord } from '../model/relations-model';
import { RelationGASRepository } from './relations-gas-repository';
import { RelationQueryService } from './relations-query.service';
import { RelationRepository } from './relations-repository';

const storageKey = (bookId: string, id: string): string => `${bookId}|${id}`;

class FakeRelationsTable {
  readonly rows = new Map<string, RelationRecord>();

  async bulkGet(keys: [string, string][]): Promise<(RelationRecord | undefined)[]> {
    return keys.map(([bookId, id]) => this.rows.get(storageKey(bookId, id)));
  }

  async put(record: RelationRecord): Promise<void> {
    this.rows.set(storageKey(record.bookId, record.id), { ...record });
  }

  async bulkPut(records: RelationRecord[]): Promise<void> {
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

const record: RelationRecord = {
  id: 'temp-1',
  bookId: 'book-1',
  bookRow: 8,
  itemRow: 0,
  sourceCharacterId: 'character-a',
  targetCharacterId: 'character-b',
  relationType: 'parent of',
  directed: true,
  description: 'A parent-child relationship.',
  color: '#D4A373',
  book: 'Book One',
  author: 'Author One',
  page: '',
  tags: ['#family'],
  feed: 5,
  contributor: '',
  syncStatus: 'pending',
};

describe('RelationRepository', () => {
  const relations = new FakeRelationsTable();
  const gasRepository = {
    getDomain: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  const books = {
    where: () => ({ equals: () => ({ first: async () => ({ id: 'book-1', row: 8 }) }) }),
  };
  let repository: RelationRepository;
  let query: RelationQueryService;

  beforeEach(() => {
    relations.rows.clear();
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: RelationGASRepository, useValue: gasRepository },
        {
          provide: LocalDBService,
          useValue: {
            indexedDB: {
              relations,
              books,
              tags: {},
              transaction: (_mode: string, _table: unknown, work: () => Promise<void>) => work(),
            },
          },
        },
      ],
    });
    repository = TestBed.inject(RelationRepository);
    query = TestBed.inject(RelationQueryService);
  });

  it('maps and persists fetched rows with the fetch bookRow and owning bookId', async () => {
    const mapper = new RelationGASMapper();
    const raw: RelationRaw = {
      ...mapper.toRaw({ ...record, id: 'relation-1', itemRow: 22 }),
      bookId: '',
      bookRow: 0,
    };
    gasRepository.getDomain.mockResolvedValue([raw]);

    const result = await repository.getDomain(8);

    expect(result[0]).toMatchObject({ bookId: 'book-1', bookRow: 8, itemRow: 22 });
    expect(await query.getRelationsByBookId('book-1')).toHaveLength(1);
    expect(await query.getRelationsByBookId('other-book')).toHaveLength(0);
  });

  it('replaces the temporary ID after a successful create', async () => {
    gasRepository.addDomainItem.mockImplementation(async () => {
      expect(relations.rows.get(storageKey('book-1', 'temp-1'))?.syncStatus).toBe('pending');
      return { ...record, id: 'gas-id', syncStatus: 'synced' };
    });

    const saved = await repository.addDomainItem(record);

    expect(saved.id).toBe('gas-id');
    expect(relations.rows.has(storageKey('book-1', 'temp-1'))).toBe(false);
    expect(relations.rows.get(storageKey('book-1', 'gas-id'))?.syncStatus).toBe('synced');
  });

  it('retains an error record when a create fails', async () => {
    gasRepository.addDomainItem.mockRejectedValue(new Error('boom'));

    await expect(repository.addDomainItem(record)).rejects.toThrow('boom');

    expect(relations.rows.get(storageKey('book-1', 'temp-1'))?.syncStatus).toBe('error');
  });

  it('deletes locally only after the remote delete succeeds', async () => {
    const existing = { ...record, id: 'relation-1', itemRow: 22, syncStatus: 'synced' as const };
    await relations.put(existing);

    gasRepository.deleteDomainItem.mockRejectedValueOnce(new Error('boom'));
    await expect(repository.deleteDomainItem(existing)).rejects.toThrow('boom');
    expect(relations.rows.has(storageKey('book-1', 'relation-1'))).toBe(true);

    gasRepository.deleteDomainItem.mockResolvedValueOnce(undefined);
    await repository.deleteDomainItem(existing);
    expect(relations.rows.has(storageKey('book-1', 'relation-1'))).toBe(false);
  });
});
