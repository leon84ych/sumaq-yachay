import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { PlaceGASMapper } from '../model/places-gas.mapper';
import { PlaceRaw, PlaceRecord } from '../model/places-model';
import { PlaceGASRepository } from './places-gas-repository';
import { PlaceQueryService } from './places-query.service';
import { PlaceRepository } from './places-repository';

const storageKey = (bookId: string, id: string): string => `${bookId}|${id}`;

class FakePlacesTable {
  readonly rows = new Map<string, PlaceRecord>();

  async put(record: PlaceRecord): Promise<void> {
    this.rows.set(storageKey(record.bookId, record.id), { ...record });
  }

  async bulkPut(records: PlaceRecord[]): Promise<void> {
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

const record: PlaceRecord = {
  id: 'temp-1',
  bookId: 'book-1',
  bookRow: 8,
  itemRow: 0,
  name: 'Dublin',
  type: 'city',
  nature: 'real',
  color: '#26734d',
  tags: ['#setting'],
  feed: 5,
  contributor: '',
  syncStatus: 'pending',
};

describe('PlaceRepository', () => {
  const places = new FakePlacesTable();
  const gasRepository = {
    getDomain: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  const books = {
    where: () => ({ equals: () => ({ first: async () => ({ id: 'book-1', row: 8 }) }) }),
  };
  let repository: PlaceRepository;
  let query: PlaceQueryService;

  beforeEach(() => {
    places.rows.clear();
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: PlaceGASRepository, useValue: gasRepository },
        {
          provide: LocalDBService,
          useValue: {
            indexedDB: {
              places,
              books,
              tags: {},
              transaction: (_mode: string, _table: unknown, work: () => Promise<void>) => work(),
            },
          },
        },
      ],
    });
    repository = TestBed.inject(PlaceRepository);
    query = TestBed.inject(PlaceQueryService);
  });

  it('maps and persists fetched rows with the fetch bookRow and owning bookId', async () => {
    const mapper = new PlaceGASMapper();
    const raw: PlaceRaw = {
      ...mapper.toRaw({ ...record, id: 'place-1', itemRow: 21 }),
      bookId: '',
      bookRow: 0,
    };
    gasRepository.getDomain.mockResolvedValue([raw]);

    const result = await repository.getDomain(8);

    expect(result[0]).toMatchObject({ bookId: 'book-1', bookRow: 8, itemRow: 21 });
    expect(await query.getPlacesByBookId('book-1')).toHaveLength(1);
    expect(await query.getPlacesByBookId('other-book')).toHaveLength(0);
  });

  it('replaces the temporary ID after a successful create', async () => {
    gasRepository.addDomainItem.mockImplementation(async () => {
      expect(places.rows.get(storageKey('book-1', 'temp-1'))?.syncStatus).toBe('pending');
      return { ...record, id: 'gas-id', syncStatus: 'synced' };
    });

    const saved = await repository.addDomainItem(record);

    expect(saved.id).toBe('gas-id');
    expect(places.rows.has(storageKey('book-1', 'temp-1'))).toBe(false);
    expect(places.rows.get(storageKey('book-1', 'gas-id'))?.syncStatus).toBe('synced');
  });

  it('retains an error record when a create fails', async () => {
    gasRepository.addDomainItem.mockRejectedValue(new Error('boom'));

    await expect(repository.addDomainItem(record)).rejects.toThrow('boom');

    expect(places.rows.get(storageKey('book-1', 'temp-1'))?.syncStatus).toBe('error');
  });

  it('deletes locally only after the remote delete succeeds', async () => {
    const existing = { ...record, id: 'place-1', itemRow: 21, syncStatus: 'synced' as const };
    await places.put(existing);

    gasRepository.deleteDomainItem.mockRejectedValueOnce(new Error('boom'));
    await expect(repository.deleteDomainItem(existing)).rejects.toThrow('boom');
    expect(places.rows.has(storageKey('book-1', 'place-1'))).toBe(true);

    gasRepository.deleteDomainItem.mockResolvedValueOnce(undefined);
    await repository.deleteDomainItem(existing);
    expect(places.rows.has(storageKey('book-1', 'place-1'))).toBe(false);
  });
});
