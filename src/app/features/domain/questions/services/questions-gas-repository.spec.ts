import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { QuestionGASMapper } from '../model/questions-gas.mapper';
import { QuestionRaw, QuestionRecord } from '../model/questions-model';
import { QuestionGASRepository } from './questions-gas-repository';

const question: QuestionRecord = {
  id: 'question-1',
  bookId: 'book-1',
  bookRow: 8,
  itemRow: 24,
  question: 'Which concept?',
  answer: 'Entropy',
  type: 'multiple-choice',
  options: [{ id: 'a', text: 'Entropy', isCorrect: true }],
  sourceDomain: 'CONCEPTS',
  sourceRowId: 'concept-1',
  sourceTerm: 'Entropy',
  bookName: 'Book One',
  page: '42',
  difficulty: 'easy',
  aiGenerated: false,
  tags: ['#physics', '#energy'],
  feed: 5,
  contributor: 'reader@example.com',
  syncStatus: 'pending',
};

describe('QuestionGASRepository', () => {
  const api = {
    getDomainPaginated: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  let repository: QuestionGASRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: GASDomainAPI, useValue: api }] });
    repository = TestBed.inject(QuestionGASRepository);
  });

  it('reads QUESTIONS with the owning book row', async () => {
    const raw: QuestionRaw = {
      ...new QuestionGASMapper().toRaw(question),
      options: JSON.stringify(question.options),
    };
    api.getDomainPaginated.mockResolvedValue({ data: { rows: [raw] } });

    const result = await repository.getDomain(8, 1);

    expect(api.getDomainPaginated).toHaveBeenCalledWith(8, 'QUESTIONS', 1, 50);
    expect(result[0]).toMatchObject({ bookRow: 8, itemRow: 24 });
  });

  it('creates from the full raw record and maps the generated ID', async () => {
    api.addDomainItem.mockResolvedValue('gas-question-id');

    const created = await repository.addDomainItem(question);

    expect(api.addDomainItem).toHaveBeenCalledWith(8, 'book-1', 'QUESTIONS', {
      id: 'question-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 24,
      question: 'Which concept?',
      answer: 'Entropy',
      type: 'multiple-choice',
      options: '[{"id":"a","text":"Entropy","isCorrect":true}]',
      sourceDomain: 'CONCEPTS',
      sourceRowId: 'concept-1',
      sourceTerm: 'Entropy',
      bookName: 'Book One',
      page: '42',
      difficulty: 'easy',
      aiGenerated: false,
      tags: '#physics|#energy',
      feed: 5,
      contributor: 'reader@example.com',
      syncStatus: 'pending',
    });
    expect(created).toMatchObject({ id: 'gas-question-id', syncStatus: 'synced' });
  });

  it('updates while retaining both row identifiers and the question ID', async () => {
    api.updateDomainItem.mockResolvedValue(undefined);

    await repository.updateDomainItem(question);

    expect(api.updateDomainItem).toHaveBeenCalledWith(
      8,
      'book-1',
      'QUESTIONS',
      'question-1',
      expect.objectContaining({ bookRow: 8, itemRow: 24, id: 'question-1' }),
    );
  });

  it('deletes with bookRow and itemRow as distinct identifiers', async () => {
    api.deleteDomainItem.mockResolvedValue(undefined);

    await repository.deleteDomainItem(question);

    expect(api.deleteDomainItem).toHaveBeenCalledWith(8, 'book-1', 'QUESTIONS', 'question-1', 24);
  });
});
