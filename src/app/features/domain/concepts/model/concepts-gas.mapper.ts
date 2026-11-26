import { Injectable } from '@angular/core';
import { GASMapperInterface } from '../../../../core/infrastructure/gas/gas-mapper-interface';
import { parseSyncStatus } from '../../../../core/infrastructure/gas/gas-utils-mappers.mapper';
import { mapTagsToArray, mapTagsToString } from '../../../../shared/tag-picker/tag-picker.mapper';
import {
  CONCEPT_DEFAULT_FEED,
  ConceptRaw,
  ConceptRawValues,
  ConceptRecord,
} from './concepts-model';

@Injectable({
  providedIn: 'root',
})
export class ConceptGASMapper implements GASMapperInterface<
  ConceptRecord,
  ConceptRaw,
  ConceptRawValues
> {
  toRecord(raw: ConceptRaw): ConceptRecord {
    return {
      id: String(raw.id),
      bookId: raw.bookId,
      bookRow: Number(raw.bookRow ?? 0),
      itemRow: Number(raw.itemRow ?? 0),
      term: raw.term ?? '',
      definition: raw.definition ?? '',
      category: raw.category ?? '',
      source: raw.source ?? '',
      tags: mapTagsToArray(raw.tags),
      syncStatus: parseSyncStatus(raw.syncStatus),
      contributor: raw.contributor ?? '',
      feed: Number(raw.feed ?? CONCEPT_DEFAULT_FEED),
    };
  }

  toRaw(record: ConceptRecord): ConceptRaw {
    return {
      id: record.id,
      bookId: record.bookId,
      bookRow: record.bookRow,
      itemRow: record.itemRow,
      term: record.term,
      definition: record.definition,
      category: record.category,
      source: record.source,
      tags: mapTagsToString(record.tags),
      syncStatus: record.syncStatus,
      contributor: record.contributor,
      feed: record.feed,
    };
  }

  toRowValues(record: ConceptRecord): ConceptRawValues {
    return [
      record.id,
      record.itemRow,
      record.term,
      record.definition,
      record.category,
      record.source,
      mapTagsToString(record.tags),
      record.feed,
      record.contributor,
      record.syncStatus,
    ];
  }
}
