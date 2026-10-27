// @vitest-environment jsdom

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppDbService } from '../../../../core/services/storage/app-db.service';
import { QuestionAttemptService } from './question-attempt.service';

describe('QuestionAttemptService', () => {
  let addAttempt: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
    addAttempt = vi.fn().mockResolvedValue(1);
    TestBed.configureTestingModule({
      providers: [
        QuestionAttemptService,
        {
          provide: AppDbService,
          useValue: { db: { questionAttempts: { add: addAttempt } } } as unknown as AppDbService,
        },
      ],
    });
  });

  it('writes attempt data to the local attempt table with an ISO timestamp', async () => {
    const service = TestBed.inject(QuestionAttemptService);
    const attemptId = await service.record({
      questionId: 'question-1',
      bookRow: 4,
      type: 'open',
      userResponse: 'My response',
      isCorrect: null,
    });

    expect(attemptId).toBe(1);
    expect(addAttempt).toHaveBeenCalledWith({
      questionId: 'question-1',
      bookRow: 4,
      type: 'open',
      userResponse: 'My response',
      isCorrect: null,
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  });
});