import { Injectable } from '@angular/core';
import { GASMapperInterface } from '../../../../core/infrastructure/gas/gas-mapper-interface';
import { parseSyncStatus } from '../../../../core/infrastructure/gas/gas-utils-mappers.mapper';
import { mapTagsToArray, mapTagsToString } from '../../../../shared/tag-picker/tag-picker.mapper';
import {
  GLOSSARY_DEFAULT_FEED,
  GlossaryRaw,
  GlossaryRawValues,
  GlossaryRecord,
} from './glossary-model';

@Injectable({ providedIn: 'root' })
export class GlossaryGASMapper implements GASMapperInterface<
  GlossaryRecord,
  GlossaryRaw,
  GlossaryRawValues
> {
  toRecord(raw: GlossaryRaw): GlossaryRecord {
    return {
      id: String(raw.id),
      bookId: raw.bookId ?? '',
      bookRow: Number(raw.bookRow ?? 0),
      itemRow: Number(raw.itemRow ?? 0),
      term: raw.term ?? '',
      definition: raw.definition ?? '',
      partOfSpeech: raw.partOfSpeech as GlossaryRecord['partOfSpeech'],
      etymology: raw.etymology,
      synonyms: raw.synonyms,
      contextSentence: raw.contextSentence,
      source: raw.source,
      page:
        raw.page === undefined || raw.page === null || raw.page === ''
          ? undefined
          : String(raw.page),
      tags: mapTagsToArray(raw.tags),
      feed: Number(raw.feed ?? GLOSSARY_DEFAULT_FEED),
      contributor: raw.contributor ?? '',
      syncStatus: parseSyncStatus(raw.syncStatus),
    };
  }

  toRaw(record: GlossaryRecord): GlossaryRaw {
    return {
      id: record.id,
      bookId: record.bookId,
      bookRow: record.bookRow,
      itemRow: record.itemRow,
      term: record.term,
      definition: record.definition,
      partOfSpeech: record.partOfSpeech,
      etymology: record.etymology,
      synonyms: record.synonyms,
      contextSentence: record.contextSentence,
      source: record.source,
      page: record.page,
      tags: mapTagsToString(record.tags),
      feed: record.feed,
      contributor: record.contributor,
      syncStatus: record.syncStatus,
    };
  }

  toRowValues(record: GlossaryRecord): GlossaryRawValues {
    return [
      record.id,
      record.itemRow,
      record.term,
      record.definition,
      record.partOfSpeech ?? '',
      record.etymology ?? '',
      record.synonyms ?? '',
      record.contextSentence ?? '',
      record.source ?? '',
      record.page ?? '',
      mapTagsToString(record.tags),
      record.feed,
      record.contributor,
      record.syncStatus,
    ];
  }
}
