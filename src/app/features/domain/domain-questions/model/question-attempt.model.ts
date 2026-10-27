import { QuestionType } from './domain-question-row.model';

export interface QuestionAttempt {
  id?: number;
  questionId: string;
  bookRow: number;
  timestamp: string;
  userResponse: string;
  isCorrect: boolean | null;
  type: QuestionType;
}