import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { QuestionGASMapper } from '../model/questions-gas.mapper';
import { QuestionRaw, QuestionRecord } from '../model/questions-model';
import { QuestionGASRepository } from './questions-gas-repository';
import { QuestionQueryService } from './questions-query.service';
import { QuestionRepository } from './questions-repository';

const storageKey = (bookId: string, id: string): string => `${bookId}|${id}`;

class FakeQuestionsTable {
  readonly rows = new Map<string, QuestionRecord>();

  async bulkGet(keys: [string, string][]): Promise<(QuestionRecord | undefined)[]> {
    return keys.map(([bookId, id]) => this.rows.get(storageKey(bookId, id)));
  }

  async put(record: QuestionRecord): Promise<void> {
    this.rows.set(storageKey(record.bookId, record.id), { ...record });
  }

  async bulkPut(records: QuestionRecord[]): Promise<void> {
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

const record: QuestionRecord = {
  id: 'temp-1',
  bookId: 'book-1',
  bookRow: 8,
  itemRow: 0,
  question: 'Which concept?',
  answer: 'Entropy',
  type: 'open',
  options: [],
  sourceDomain: 'MANUAL',
  aiGenerated: false,
  tags: ['#physics'],
  feed: 5,
  contributor: '',
  syncStatus: 'pending',
};

describe('QuestionRepository', () => {
  const questions = new FakeQuestionsTable();
  const gasRepository = {
    getDomain: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  const books = {
    where: () => ({ equals: () => ({ first: async () => ({ id: 'book-1', row: 8 }) }) }),
  };
  let repository: QuestionRepository;
  let query: QuestionQueryService;

  beforeEach(() => {
    questions.rows.clear();
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: QuestionGASRepository, useValue: gasRepository },
        {
          provide: LocalDBService,
          useValue: {
            indexedDB: {
              questions,
              books,
              tags: {},
              transaction: (_mode: string, _table: unknown, work: () => Promise<void>) => work(),
            },
          },
        },
      ],
    });
    repository = TestBed.inject(QuestionRepository);
    query = TestBed.inject(QuestionQueryService);
  });

  it('maps and persists fetched rows with the fetch bookRow and owning bookId', async () => {
    const mapper = new QuestionGASMapper();
    const raw: QuestionRaw = {
      ...mapper.toRaw({ ...record, id: 'question-1', itemRow: 25 }),
      bookId: '',
      bookRow: 0,
    };
    gasRepository.getDomain.mockResolvedValue([raw]);

    const result = await repository.getDomain(8);

    expect(result[0]).toMatchObject({ bookId: 'book-1', bookRow: 8, itemRow: 25 });
    expect(await query.getQuestionsByBookId('book-1')).toHaveLength(1);
    expect(await query.getQuestionsByBookId('other-book')).toHaveLength(0);
  });

  it('replaces the temporary ID after a successful create', async () => {
    gasRepository.addDomainItem.mockImplementation(async () => {
      expect(questions.rows.get(storageKey('book-1', 'temp-1'))?.syncStatus).toBe('pending');
      return { ...record, id: 'gas-id', syncStatus: 'synced' };
    });

    const saved = await repository.addDomainItem(record);

    expect(saved.id).toBe('gas-id');
    expect(questions.rows.has(storageKey('book-1', 'temp-1'))).toBe(false);
    expect(questions.rows.get(storageKey('book-1', 'gas-id'))?.syncStatus).toBe('synced');
  });

  it('retains an error record when a create fails', async () => {
    gasRepository.addDomainItem.mockRejectedValue(new Error('boom'));

    await expect(repository.addDomainItem(record)).rejects.toThrow('boom');

    expect(questions.rows.get(storageKey('book-1', 'temp-1'))?.syncStatus).toBe('error');
  });

  it('deletes locally only after the remote delete succeeds', async () => {
    const existing = { ...record, id: 'question-1', itemRow: 25, syncStatus: 'synced' as const };
    await questions.put(existing);

    gasRepository.deleteDomainItem.mockRejectedValueOnce(new Error('boom'));
    await expect(repository.deleteDomainItem(existing)).rejects.toThrow('boom');
    expect(questions.rows.has(storageKey('book-1', 'question-1'))).toBe(true);

    gasRepository.deleteDomainItem.mockResolvedValueOnce(undefined);
    await repository.deleteDomainItem(existing);
    expect(questions.rows.has(storageKey('book-1', 'question-1'))).toBe(false);
  });
});
