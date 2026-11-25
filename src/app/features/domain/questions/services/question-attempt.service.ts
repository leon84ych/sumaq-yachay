import { Injectable, inject } from '@angular/core';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { QuestionAttempt } from '../model/question-attempt.model';

export type NewQuestionAttempt = Omit<QuestionAttempt, 'id' | 'timestamp'> & {
  timestamp?: string;
};

@Injectable({ providedIn: 'root' })
export class QuestionAttemptService {
  private readonly dbService = inject(LocalDBService);

  async record(attempt: NewQuestionAttempt): Promise<number> {
    return this.dbService.indexedDB.questionAttempts.add({
      ...attempt,
      timestamp: attempt.timestamp ?? new Date().toISOString(),
    });
  }

  async listForBook(bookId: string): Promise<QuestionAttempt[]> {
    return this.dbService.indexedDB.questionAttempts.where('bookId').equals(bookId).toArray();
  }
}