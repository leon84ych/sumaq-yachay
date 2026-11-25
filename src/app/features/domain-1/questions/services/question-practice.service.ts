import { Injectable, inject } from '@angular/core';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { ConfigService } from '../../../../core/services/config/config.service';
import { parseTagsFromArray } from '../../../../shared/tag-picker/tag-picker.mapper';
import { matchesStudySearch, parseStudySearch } from '../../../../shared/utils/study-search';
import { QuestionOption, QuestionRecord, QuestionType } from '../../../domain-1/questions/model/questions-model';

export interface QuestionPracticeFilters {
  query?: string;
  limit?: number;
}

export interface QuestionPracticeItem extends QuestionRecord {
  bookName: string;
  bookAuthor: string;
  options: QuestionOption[];
}

const MAX_BATCH_SIZE = 10;
const QUESTION_TYPES = new Set<QuestionType>([
  'flashcard',
  'multiple-choice',
  'true-false',
  'open',
]);

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

@Injectable({ providedIn: 'root' })
export class QuestionPracticeService {
  private readonly localDBService = inject(LocalDBService);
  private readonly configService = inject(ConfigService);

  async loadRandomBatch(filters: QuestionPracticeFilters = {}): Promise<QuestionPracticeItem[]> {
    if (this.configService.isLocalSampleDataEnabled()) {
      await this.localDBService.seedLocalSampleData();
    }
    const [books, questions] = await Promise.all([
      this.localDBService.indexedDB.books.toArray(),
      this.localDBService.indexedDB.questions.toArray(),
    ]);
    const bookById = new Map(books.map((book) => [book.id, book]));
    const query = parseStudySearch(filters.query ?? '');
    const matching: QuestionPracticeItem[] = [];

    for (const question of questions) {
      const book = bookById.get(question.bookId);
      const tags = parseTagsFromArray(question.tags);

      const bookName = question.bookName || book?.name || '';
      const bookAuthor = book?.author || '';
      const searchFields = [
        question.question,
        question.answer,
        question.sourceTerm,
        question.sourceDomain,
        question.type,
        question.difficulty,
        bookName,
        bookAuthor,
        'QUESTIONS',
        'questions',
        'preguntas',
        ...tags,
      ];
      if (
        !matchesStudySearch(query, searchFields, tags, {
          book: bookName,
          author: bookAuthor,
          contributor: question.contributor,
        })
      )
        continue;
      if (!QUESTION_TYPES.has(question.type)) continue;

      matching.push({
        ...question,
        tags,
        options: this.normalizeOptions(question.options),
        bookName,
        bookAuthor,
      });
    }

    this.shuffle(matching);
    const requestedLimit = Math.max(0, filters.limit ?? MAX_BATCH_SIZE);
    return matching.slice(0, Math.min(MAX_BATCH_SIZE, requestedLimit));
  }

  optionsFor(question: QuestionPracticeItem): QuestionOption[] {
    if (question.options.length > 0) return question.options;
    if (question.type !== 'true-false') return [];

    const answer = normalizeText(question.answer);
    const trueAnswers = ['true', 'yes', 'verdadero', 'verdadera', 'sí', 'si'];
    const falseAnswers = ['false', 'no', 'falso', 'falsa'];
    if (![...trueAnswers, ...falseAnswers].includes(answer)) return [];
    const trueIsCorrect = trueAnswers.includes(answer);
    return [
      { id: 'true', text: 'true', isCorrect: trueIsCorrect },
      { id: 'false', text: 'false', isCorrect: !trueIsCorrect },
    ];
  }

  private normalizeOptions(value: unknown): QuestionOption[] {
    let options = value;
    if (typeof options === 'string') {
      try {
        options = JSON.parse(options) as unknown;
      } catch {
        return [];
      }
    }
    if (!Array.isArray(options)) return [];

    return options.flatMap((option, index) => {
      if (!option || typeof option !== 'object') return [];
      const record = option as Record<string, unknown>;
      const text = typeof record['text'] === 'string' ? record['text'].trim() : '';
      if (!text) return [];
      return [
        {
          id: String(record['id'] ?? `option-${index + 1}`),
          text,
          isCorrect: record['isCorrect'] === true,
        },
      ];
    });
  }

  private shuffle(questions: QuestionPracticeItem[]): void {
    for (let index = questions.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [questions[index], questions[swapIndex]] = [questions[swapIndex], questions[index]];
    }
  }
}
