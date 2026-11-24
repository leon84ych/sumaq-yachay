import { Injectable } from '@angular/core';
import { GASMapperInterface } from '../../../../core/infrastructure/gas/gas-mapper-interface';
import { parseSyncStatus } from '../../../../core/infrastructure/gas/gas-utils-mappers.mapper';
import { mapTagsToArray, mapTagsToString } from '../../../../shared/tag-picker/tag-picker.mapper';
import {
  QUESTION_DEFAULT_FEED,
  QuestionDifficulty,
  QuestionOption,
  QuestionRaw,
  QuestionRawValues,
  QuestionRecord,
  QuestionType,
} from './questions-model';

@Injectable({ providedIn: 'root' })
export class QuestionGASMapper implements GASMapperInterface<
  QuestionRecord,
  QuestionRaw,
  QuestionRawValues
> {
  toRecord(raw: QuestionRaw): QuestionRecord {
    return {
      id: String(raw.id),
      bookId: raw.bookId ?? '',
      bookRow: Number(raw.bookRow ?? 0),
      itemRow: Number(raw.itemRow ?? 0),
      question: raw.question ?? '',
      answer: raw.answer ?? '',
      type: raw.type,
      options: this.parseOptions(raw.options),
      sourceDomain: raw.sourceDomain ?? 'MANUAL',
      sourceRowId: raw.sourceRowId || undefined,
      sourceTerm: raw.sourceTerm || undefined,
      bookName: raw.bookName || undefined,
      page:
        raw.page === undefined || raw.page === null || raw.page === ''
          ? undefined
          : String(raw.page),
      difficulty: raw.difficulty,
      aiGenerated: raw.aiGenerated === true || String(raw.aiGenerated).toLowerCase() === 'true',
      tags: mapTagsToArray(raw.tags),
      feed: Number(raw.feed ?? QUESTION_DEFAULT_FEED),
      contributor: raw.contributor ?? '',
      syncStatus: parseSyncStatus(raw.syncStatus),
    };
  }

  toRaw(record: QuestionRecord): QuestionRaw {
    return {
      id: record.id,
      bookId: record.bookId,
      bookRow: record.bookRow,
      itemRow: record.itemRow,
      question: record.question,
      answer: record.answer,
      type: record.type,
      options: JSON.stringify(record.options ?? []),
      sourceDomain: record.sourceDomain,
      sourceRowId: record.sourceRowId,
      sourceTerm: record.sourceTerm,
      bookName: record.bookName,
      page: record.page,
      difficulty: record.difficulty,
      aiGenerated: record.aiGenerated,
      tags: mapTagsToString(record.tags),
      feed: record.feed,
      contributor: record.contributor,
      syncStatus: record.syncStatus,
    };
  }

  toRowValues(record: QuestionRecord): QuestionRawValues {
    return [
      record.id,
      record.itemRow,
      record.question,
      record.answer,
      record.type,
      JSON.stringify(record.options ?? []),
      record.sourceDomain,
      record.sourceRowId ?? '',
      record.sourceTerm ?? '',
      record.bookName ?? '',
      record.page ?? '',
      record.difficulty ?? '',
      record.aiGenerated,
      mapTagsToString(record.tags),
      record.feed,
      record.contributor,
      record.syncStatus,
    ];
  }

  private parseOptions(value: QuestionRaw['options']): QuestionOption[] {
    let options: unknown = value;
    if (typeof options === 'string') {
      try {
        options = JSON.parse(options) as unknown;
      } catch {
        return [];
      }
    }
    if (!Array.isArray(options)) {
      return [];
    }

    return options.flatMap((option, index) => {
      if (typeof option !== 'object' || option === null) {
        return [];
      }
      const rawOption = option as Record<string, unknown>;
      const text = typeof rawOption['text'] === 'string' ? rawOption['text'].trim() : '';
      if (!text) {
        return [];
      }
      return [
        {
          id: String(rawOption['id'] ?? `option-${index + 1}`),
          text,
          isCorrect: rawOption['isCorrect'] === true || String(rawOption['isCorrect']) === 'true',
        },
      ];
    });
  }
}
