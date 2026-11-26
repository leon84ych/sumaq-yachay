import { Injectable } from '@angular/core';
import { GASMapperInterface } from '../../../../core/infrastructure/gas/gas-mapper-interface';
import { parseSyncStatus } from '../../../../core/infrastructure/gas/gas-utils-mappers.mapper';
import { mapTagsToArray, mapTagsToString } from '../../../../shared/tag-picker/tag-picker.mapper';
import { AssociationRaw, AssociationRawValues, AssociationRecord } from './associations-model';

@Injectable({ providedIn: 'root' })
export class AssociationGASMapper implements GASMapperInterface<
  AssociationRecord,
  AssociationRaw,
  AssociationRawValues
> {
  toRecord(raw: AssociationRaw): AssociationRecord {
    return {
      id: String(raw.id),
      bookId: raw.bookId ?? '',
      bookRow: Number(raw.bookRow ?? 0),
      itemRow: Number(raw.itemRow ?? 0),
      sourceConceptId: raw.sourceConceptId ?? '',
      targetConceptId: raw.targetConceptId ?? '',
      relationType: raw.relationType ?? '',
      directed: raw.directed === true || String(raw.directed).toLowerCase() === 'true',
      description: raw.description ?? '',
      color: raw.color ?? '#735D78',
      book: raw.book ?? '',
      author: raw.author ?? '',
      page: raw.page ?? '',
      tags: mapTagsToArray(raw.tags),
      feed: Number(raw.feed ?? 5),
      contributor: raw.contributor ?? '',
      syncStatus: parseSyncStatus(raw.syncStatus),
    };
  }

  toRaw(record: AssociationRecord): AssociationRaw {
    return {
      id: record.id,
      bookId: record.bookId,
      bookRow: record.bookRow,
      itemRow: record.itemRow,
      sourceConceptId: record.sourceConceptId,
      targetConceptId: record.targetConceptId,
      relationType: record.relationType,
      directed: record.directed,
      description: record.description,
      color: record.color,
      book: record.book,
      author: record.author,
      page: record.page,
      tags: mapTagsToString(record.tags),
      feed: record.feed,
      contributor: record.contributor,
      syncStatus: record.syncStatus,
    };
  }

  toRowValues(record: AssociationRecord): AssociationRawValues {
    return [
      record.id,
      record.itemRow,
      record.sourceConceptId,
      record.targetConceptId,
      record.relationType,
      record.directed,
      record.description,
      record.color,
      record.book,
      record.author,
      record.page,
      mapTagsToString(record.tags),
      record.feed,
      record.contributor,
      record.syncStatus,
    ];
  }
}
