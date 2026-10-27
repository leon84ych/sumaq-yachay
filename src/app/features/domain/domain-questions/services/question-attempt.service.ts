import { Injectable, inject } from '@angular/core';
import { AppDbService } from '../../../../core/services/storage/app-db.service';
import { QuestionAttempt } from '../model/question-attempt.model';

export type NewQuestionAttempt = Omit<QuestionAttempt, 'id' | 'timestamp'> & {
  timestamp?: string;
};

@Injectable({ providedIn: 'root' })
export class QuestionAttemptService {
  private readonly dbService = inject(AppDbService);

  async record(attempt: NewQuestionAttempt): Promise<number> {
    return this.dbService.db.questionAttempts.add({
      ...attempt,
      timestamp: attempt.timestamp ?? new Date().toISOString(),
    });
  }

  async listForBook(bookRow: number): Promise<QuestionAttempt[]> {
    return this.dbService.db.questionAttempts.where('bookRow').equals(bookRow).toArray();
  }
}