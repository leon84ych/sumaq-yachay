import { Injectable, inject } from '@angular/core';
import { CatalogItem } from '../../../catalog/models/catalog-item.model';
import { AppDbService } from '../../../../core/services/storage/app-db.service';
import { ConfigService } from '../../../../core/services/config.service';
import { parseTags } from '../../../../shared/utils/tag-utils';
import {
  QuestionOption,
  QuestionRecord,
  QuestionType,
} from '../model/domain-question-row.model';

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
  private readonly dbService = inject(AppDbService);
  private readonly configService = inject(ConfigService);
  private sampleDataSeeded = false;

  async loadRandomBatch(filters: QuestionPracticeFilters = {}): Promise<QuestionPracticeItem[]> {
    await this.ensureSampleData();
    const [catalogs, questions] = await Promise.all([
      this.dbService.db.catalogs.toArray(),
      this.dbService.db.questions.toArray(),
    ]);
    const catalogByRow = new Map(catalogs.map((catalog) => [catalog.row, catalog]));
    const query = normalizeText(filters.query);
    const matching: QuestionPracticeItem[] = [];

    for (const question of questions) {
      const catalog = catalogByRow.get(question.row);
      const tags = parseTags(question.tags);

      const bookName = question.bookName || catalog?.name || '';
      const bookAuthor = question.author || catalog?.author || '';
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
      if (query && !searchFields.some((field) => normalizeText(field).includes(query))) continue;
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

  private async ensureSampleData(): Promise<void> {
    if (this.configService.isLocalSampleDataEnabled() && !this.sampleDataSeeded) {
      await this.dbService.seedLocalSampleData();
      this.sampleDataSeeded = true;
    }
  }

  private shuffle(questions: QuestionPracticeItem[]): void {
    for (let index = questions.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [questions[index], questions[swapIndex]] = [questions[swapIndex], questions[index]];
    }
  }
}