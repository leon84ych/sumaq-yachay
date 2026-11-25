import { QuestionType } from '../../../domain-1/questions/model/questions-model';

export interface QuestionAttempt {
  id?: number;
  questionId: string;
  bookId: string;
  bookRow: number;
  timestamp: string;
  userResponse: string;
  isCorrect: boolean | null;
  type: QuestionType;
}