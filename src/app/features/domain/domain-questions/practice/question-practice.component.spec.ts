// @vitest-environment jsdom

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestionAttemptService } from '../services/question-attempt.service';
import { QuestionPracticeItem, QuestionPracticeService } from '../services/question-practice.service';
import { QuestionPracticeComponent } from './question-practice.component';

describe('QuestionPracticeComponent', () => {
  let recordAttempt: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
    recordAttempt = vi.fn().mockResolvedValue(1);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: QuestionPracticeService,
          useValue: {
            loadCatalogs: vi.fn().mockResolvedValue([]),
            loadAvailableTags: vi.fn().mockResolvedValue([]),
            loadRandomBatch: vi.fn().mockResolvedValue([]),
            optionsFor: (question: QuestionPracticeItem) => question.options,
          },
        },
        { provide: QuestionAttemptService, useValue: { record: recordAttempt } },
      ],
    });
  });

  function createComponent(question: QuestionPracticeItem): QuestionPracticeComponent {
    const component = TestBed.runInInjectionContext(() => new QuestionPracticeComponent());
    component.questions.set([question]);
    return component;
  }

  it('records a flashcard self-assessment after its answer is revealed', async () => {
    const question = createQuestion('flashcard');
    const component = createComponent(question);

    component.revealFlashcardAnswer();
    await component.assessFlashcard(true);

    expect(recordAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        questionId: question.id,
        bookRow: question.row,
        userResponse: 'self-assessed: correct',
        isCorrect: true,
        type: 'flashcard',
      }),
    );
  });

  it('records multiple-choice correctness from the configured option', async () => {
    const question = createQuestion('multiple-choice');
    const component = createComponent(question);
    component.selectOption(question.options[0]);

    await component.submitChoice();

    expect(recordAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ userResponse: 'Right choice', isCorrect: true }),
    );
  });

  it('records open responses without automatic grading', async () => {
    const question = createQuestion('open');
    const component = createComponent(question);
    component.freeResponse.set('  My own response  ');

    await component.submitOpenResponse();

    expect(recordAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ userResponse: 'My own response', isCorrect: null }),
    );
  });
});

function createQuestion(type: QuestionPracticeItem['type']): QuestionPracticeItem {
  return {
    id: 'question-1',
    row: 7,
    question: 'Prompt',
    answer: 'Reference answer',
    type,
    sourceDomain: 'CONCEPTS',
    feed: 5,
    contributor: 'author',
    syncStatus: 'synced',
    tags: [],
    options: [
      { id: 'right', text: 'Right choice', isCorrect: true },
      { id: 'wrong', text: 'Wrong choice', isCorrect: false },
    ],
    bookName: 'Book',
    bookAuthor: 'Author',
  };
}