import { Learnable } from '../../shared/model/domain-shared-model';

export const QUESTION_TYPES = ['flashcard', 'multiple-choice', 'true-false', 'open'] as const;
export const QUESTION_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuestionRaw {
  id: string;
  bookId: string;
  bookRow: number;
  itemRow: number;
  question: string;
  answer: string;
  type: QuestionType;
  options?: string | QuestionOption[] | null;
  sourceDomain: string;
  sourceRowId?: string;
  sourceTerm?: string;
  bookName?: string;
  page?: string | number;
  difficulty?: QuestionDifficulty;
  aiGenerated?: boolean | string;
  tags: string;
  feed: number;
  contributor: string;
  syncStatus: string;
}

export interface QuestionRecord extends Learnable {
  question: string;
  answer: string;
  type: QuestionType;
  options: QuestionOption[];
  sourceDomain: string;
  sourceRowId?: string;
  sourceTerm?: string;
  bookName?: string;
  page?: string;
  difficulty?: QuestionDifficulty;
  aiGenerated: boolean;
  feed: number;
}

export type QuestionRawValues = [
  string,
  number,
  string,
  string,
  QuestionType,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  boolean,
  string,
  number,
  string,
  string,
];

export const QUESTION_DEFAULT_FEED = 5;
