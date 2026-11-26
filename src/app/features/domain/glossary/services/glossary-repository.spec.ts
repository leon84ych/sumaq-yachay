import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../../../core/services/config/config.service';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { GlossaryGASMapper } from '../model/glossary-gas.mapper';
import { GlossaryRaw, GlossaryRecord } from '../model/glossary-model';
import { GlossaryGASRepository } from './glossary-gas-repository';
import { GlossaryQueryService } from './glossary-query.service';
import { GlossaryRepository } from './glossary-repository';

const storageKey = (bookId: string, id: string): string => `${bookId}|${id}`;

class FakeGlossaryTable {
  readonly rows = new Map<string, GlossaryRecord>();

  async put(record: GlossaryRecord): Promise<void> {
    this.rows.set(storageKey(record.bookId, record.id), { ...record });
  }

  async bulkPut(records: GlossaryRecord[]): Promise<void> {
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

const record: GlossaryRecord = {
  id: 'temp-1',
  bookId: 'book-1',
  bookRow: 8,
  itemRow: 0,
  term: 'Logos',
  language: 'Ancient Greek',
  definition: 'A principle of reason.',
  tags: ['#reason'],
  feed: 5,
  contributor: '',
  syncStatus: 'pending',
};

describe('GlossaryRepository', () => {
  const glossary = new FakeGlossaryTable();
  const gasRepository = {
    getDomain: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  const books = {
    where: () => ({ equals: () => ({ first: async () => ({ id: 'book-1', row: 8 }) }) }),
  };
  let repository: GlossaryRepository;
  let query: GlossaryQueryService;
  let localSampleDataEnabled: boolean;

  beforeEach(() => {
    localSampleDataEnabled = false;
    glossary.rows.clear();
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: ConfigService, useValue: { isLocalSampleDataEnabled: () => localSampleDataEnabled } },
        { provide: GlossaryGASRepository, useValue: gasRepository },
        {
          provide: LocalDBService,
          useValue: {
            indexedDB: {
              glossary,
              books,
              tags: {},
              transaction: (_mode: string, _table: unknown, work: () => Promise<void>) => work(),
            },
          },
        },
      ],
    });
    repository = TestBed.inject(GlossaryRepository);
    query = TestBed.inject(GlossaryQueryService);
  });

  it('maps and persists fetched rows with the fetch bookRow and owning bookId', async () => {
    const mapper = new GlossaryGASMapper();
    const raw: GlossaryRaw = {
      ...mapper.toRaw({ ...record, id: 'term-1', itemRow: 19 }),
      bookId: '',
      bookRow: 0,
    };
    gasRepository.getDomain.mockResolvedValue([raw]);

    const result = await repository.getDomain(8);

    expect(result[0]).toMatchObject({ bookId: 'book-1', bookRow: 8, itemRow: 19 });
    expect(await query.getGlossaryByBookId('book-1')).toHaveLength(1);
    expect(await query.getGlossaryByBookId('other-book')).toHaveLength(0);
  });

  it('replaces the temporary ID after a successful create', async () => {
    gasRepository.addDomainItem.mockImplementation(async () => {
      expect(glossary.rows.get(storageKey('book-1', 'temp-1'))?.syncStatus).toBe('pending');
      return { ...record, id: 'gas-id', syncStatus: 'synced' };
    });

    const saved = await repository.addDomainItem(record);

    expect(saved.id).toBe('gas-id');
    expect(glossary.rows.has(storageKey('book-1', 'temp-1'))).toBe(false);
    expect(glossary.rows.get(storageKey('book-1', 'gas-id'))?.syncStatus).toBe('synced');
  });

  it('retains an error record when a create fails', async () => {
    gasRepository.addDomainItem.mockRejectedValue(new Error('boom'));

    await expect(repository.addDomainItem(record)).rejects.toThrow('boom');

    expect(glossary.rows.get(storageKey('book-1', 'temp-1'))?.syncStatus).toBe('error');
  });

  it('keeps sample data create, update, and delete operations local', async () => {
    localSampleDataEnabled = true;

    const created = await repository.addDomainItem({ ...record, id: 'sample-term' });
    expect(created.syncStatus).toBe('pending');
    expect(gasRepository.addDomainItem).not.toHaveBeenCalled();

    const updated = await repository.updateDomainItem({ ...created, definition: 'Edited locally.' });
    expect(updated.definition).toBe('Edited locally.');
    expect(updated.syncStatus).toBe('pending');
    expect(gasRepository.updateDomainItem).not.toHaveBeenCalled();

    await repository.deleteDomainItem(updated);
    expect(glossary.rows.has(storageKey('book-1', 'sample-term'))).toBe(false);
    expect(gasRepository.deleteDomainItem).not.toHaveBeenCalled();
  });

  it('deletes locally only after the remote delete succeeds', async () => {
    const existing = { ...record, id: 'term-1', itemRow: 19, syncStatus: 'synced' as const };
    await glossary.put(existing);

    gasRepository.deleteDomainItem.mockRejectedValueOnce(new Error('boom'));
    await expect(repository.deleteDomainItem(existing)).rejects.toThrow('boom');
    expect(glossary.rows.has(storageKey('book-1', 'term-1'))).toBe(true);

    gasRepository.deleteDomainItem.mockResolvedValueOnce(undefined);
    await repository.deleteDomainItem(existing);
    expect(glossary.rows.has(storageKey('book-1', 'term-1'))).toBe(false);
  });
});
