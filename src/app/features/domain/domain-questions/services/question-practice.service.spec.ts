// @vitest-environment jsdom

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppDbService } from '../../../../core/services/storage/app-db.service';
import { ConfigService } from '../../../../core/services/config.service';
import { QuestionRecord } from '../model/domain-question-row.model';
import { QuestionPracticeService } from './question-practice.service';

describe('QuestionPracticeService', () => {
  let questions: QuestionRecord[];

  beforeAll(() => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
    questions = [
      {
        id: 'q-1',
        row: 1,
        question: 'What is entropy?',
        answer: 'A measure of disorder',
        type: 'flashcard',
        sourceDomain: 'CONCEPTS',
        sourceTerm: 'Entropy',
        tags: ['#physics'],
        feed: 5,
        contributor: 'author',
        syncStatus: 'synced',
      },
      {
        id: 'q-2',
        row: 2,
        question: 'A second question',
        answer: 'An answer',
        type: 'open',
        sourceDomain: 'CONCEPTS',
        tags: ['#biology'],
        feed: 5,
        contributor: 'author',
        syncStatus: 'synced',
      },
    ];

    TestBed.configureTestingModule({
      providers: [
        QuestionPracticeService,
        {
          provide: AppDbService,
          useValue: {
            db: {
              catalogs: {
                toArray: vi.fn().mockResolvedValue([
                  { id: 'book-1', row: 1, name: 'Book One', author: 'Author One' },
                  { id: 'book-2', row: 2, name: 'Book Two', author: 'Author Two' },
                ]),
              },
              questions: { toArray: vi.fn(async () => questions) },
            },
            seedLocalSampleData: vi.fn(),
          } as unknown as AppDbService,
        },
        { provide: ConfigService, useValue: { isLocalSampleDataEnabled: () => false } },
      ],
    });
  });

  it('searches book, author, domain, tag, and text in one query field', async () => {
    const service = TestBed.inject(QuestionPracticeService);

    const byBook = await service.loadRandomBatch({ query: 'book one' });
    const byAuthor = await service.loadRandomBatch({ query: 'author one' });
    const byDomain = await service.loadRandomBatch({ query: 'concepts' });
    const byTag = await service.loadRandomBatch({ query: 'physics' });
    const byText = await service.loadRandomBatch({ query: 'entropy' });

    expect(byBook).toHaveLength(1);
    expect(byAuthor).toHaveLength(1);
    expect(byDomain).toHaveLength(2);
    expect(byTag).toHaveLength(1);
    expect(byText).toHaveLength(1);
    expect(byBook[0]).toMatchObject({ bookName: 'Book One', bookAuthor: 'Author One' });
  });

  it('caps a random practice batch at ten questions', async () => {
    questions = Array.from({ length: 25 }, (_, index) => ({
      id: `q-${index}`,
      row: 1,
      question: `Question ${index}`,
      answer: `Answer ${index}`,
      type: 'open' as const,
      sourceDomain: 'MANUAL',
      feed: 5,
      contributor: 'author',
      syncStatus: 'synced' as const,
    }));
    const service = TestBed.inject(QuestionPracticeService);

    const result = await service.loadRandomBatch({ limit: 50 });

    expect(result).toHaveLength(10);
  });
});