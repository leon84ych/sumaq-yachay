import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { QuestionGASMapper } from './questions-gas.mapper';
import { QuestionRaw, QuestionRecord } from './questions-model';

describe('QuestionGASMapper', () => {
  let mapper: QuestionGASMapper;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    mapper = TestBed.inject(QuestionGASMapper);
  });

  it('maps JSON options, tags, status, and distinct row identifiers', () => {
    const raw: QuestionRaw = {
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
      page: 42,
      difficulty: 'easy',
      aiGenerated: 'true',
      tags: '#physics|#energy',
      feed: 5,
      contributor: 'reader@example.com',
      syncStatus: 'synced',
    };

    expect(mapper.toRecord(raw)).toMatchObject({
      bookRow: 8,
      itemRow: 24,
      page: '42',
      aiGenerated: true,
      options: [{ id: 'a', text: 'Entropy', isCorrect: true }],
      tags: ['#physics', '#energy'],
      syncStatus: 'synced',
    });
  });

  it('serializes every business and transport field to GAS', () => {
    const record: QuestionRecord = {
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
      aiGenerated: true,
      tags: ['#physics', '#energy'],
      feed: 5,
      contributor: 'reader@example.com',
      syncStatus: 'pending',
    };

    expect(mapper.toRaw(record)).toMatchObject({
      id: 'question-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 24,
      options: '[{"id":"a","text":"Entropy","isCorrect":true}]',
      tags: '#physics|#energy',
      contributor: 'reader@example.com',
      syncStatus: 'pending',
    });
  });
});
