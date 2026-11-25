import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { CharacterGASMapper } from '../model/characters-gas.mapper';
import { CharacterRaw, CharacterRecord } from '../model/characters-model';
import { CharacterGASRepository } from './characters-gas-repository';
import { CharacterQueryService } from './characters-query.service';
import { CharacterRepository } from './characters-repository';

const storageKey = (bookId: string, id: string): string => `${bookId}|${id}`;

class FakeCharactersTable {
  readonly rows = new Map<string, CharacterRecord>();

  async put(record: CharacterRecord): Promise<void> {
    this.rows.set(storageKey(record.bookId, record.id), { ...record });
  }

  async bulkPut(records: CharacterRecord[]): Promise<void> {
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

const record: CharacterRecord = {
  id: 'temp-1',
  bookId: 'book-1',
  bookRow: 8,
  itemRow: 0,
  name: 'A character',
  role: 'protagonist',
  tags: ['#one'],
  feed: 5,
  contributor: '',
  syncStatus: 'pending',
};

describe('CharacterRepository', () => {
  const characters = new FakeCharactersTable();
  const gasRepository = {
    getDomain: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  const books = {
    where: () => ({ equals: () => ({ first: async () => ({ id: 'book-1', row: 8 }) }) }),
  };
  let repository: CharacterRepository;
  let query: CharacterQueryService;

  beforeEach(() => {
    characters.rows.clear();
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: CharacterGASRepository, useValue: gasRepository },
        {
          provide: LocalDBService,
          useValue: {
            indexedDB: {
              characters,
              books,
              tags: {},
              transaction: (_mode: string, _table: unknown, work: () => Promise<void>) => work(),
            },
          },
        },
      ],
    });
    repository = TestBed.inject(CharacterRepository);
    query = TestBed.inject(CharacterQueryService);
  });

  it('persists fetched rows with the fetch bookRow and owning bookId', async () => {
    const mapper = new CharacterGASMapper();
    const raw: CharacterRaw = {
      ...mapper.toRaw({ ...record, id: 'c-1', itemRow: 17 }),
      bookId: '',
      bookRow: 0,
    };
    gasRepository.getDomain.mockResolvedValue([raw]);

    const result = await repository.getDomain(8);

    expect(result[0]).toMatchObject({ bookId: 'book-1', bookRow: 8, itemRow: 17 });
    expect(await query.getCharactersByBookId('book-1')).toHaveLength(1);
    expect(await query.getCharactersByBookId('other-book')).toHaveLength(0);
  });

  it('replaces the temporary ID after a successful create', async () => {
    gasRepository.addDomainItem.mockImplementation(async () => {
      expect(characters.rows.get(storageKey('book-1', 'temp-1'))?.syncStatus).toBe('pending');
      return { ...record, id: 'gas-id', syncStatus: 'synced' };
    });

    const saved = await repository.addDomainItem(record);

    expect(saved.id).toBe('gas-id');
    expect(characters.rows.has(storageKey('book-1', 'temp-1'))).toBe(false);
    expect(characters.rows.get(storageKey('book-1', 'gas-id'))?.syncStatus).toBe('synced');
  });

  it('retains an error record when a create fails', async () => {
    gasRepository.addDomainItem.mockRejectedValue(new Error('boom'));

    await expect(repository.addDomainItem(record)).rejects.toThrow('boom');

    expect(characters.rows.get(storageKey('book-1', 'temp-1'))?.syncStatus).toBe('error');
  });

  it('deletes locally only after the remote delete succeeds', async () => {
    const existing = { ...record, id: 'c-1', itemRow: 17, syncStatus: 'synced' as const };
    await characters.put(existing);

    gasRepository.deleteDomainItem.mockRejectedValueOnce(new Error('boom'));
    await expect(repository.deleteDomainItem(existing)).rejects.toThrow('boom');
    expect(characters.rows.has(storageKey('book-1', 'c-1'))).toBe(true);

    gasRepository.deleteDomainItem.mockResolvedValueOnce(undefined);
    await repository.deleteDomainItem(existing);
    expect(characters.rows.has(storageKey('book-1', 'c-1'))).toBe(false);
  });
});