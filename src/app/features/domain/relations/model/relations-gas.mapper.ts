import { Injectable } from '@angular/core';
import { GASMapperInterface } from '../../../../core/infrastructure/gas/gas-mapper-interface';
import { parseSyncStatus } from '../../../../core/infrastructure/gas/gas-utils-mappers.mapper';
import { mapTagsToArray, mapTagsToString } from '../../../../shared/tag-picker/tag-picker.mapper';
import { RelationRaw, RelationRawValues, RelationRecord } from './relations-model';

@Injectable({ providedIn: 'root' })
export class RelationGASMapper implements GASMapperInterface<
  RelationRecord,
  RelationRaw,
  RelationRawValues
> {
  toRecord(raw: RelationRaw): RelationRecord {
    return {
      id: String(raw.id),
      bookId: raw.bookId ?? '',
      bookRow: Number(raw.bookRow ?? 0),
      itemRow: Number(raw.itemRow ?? 0),
      sourceCharacterId: raw.sourceCharacterId ?? '',
      targetCharacterId: raw.targetCharacterId ?? '',
      relationType: raw.relationType ?? '',
      directed: raw.directed === true || String(raw.directed).toLowerCase() === 'true',
      description: raw.description ?? '',
      color: raw.color ?? '#D4A373',
      book: raw.book ?? '',
      author: raw.author ?? '',
      page: raw.page ?? '',
      tags: mapTagsToArray(raw.tags),
      feed: Number(raw.feed ?? 5),
      contributor: raw.contributor ?? '',
      syncStatus: parseSyncStatus(raw.syncStatus),
    };
  }

  toRaw(record: RelationRecord): RelationRaw {
    return {
      id: record.id,
      bookId: record.bookId,
      bookRow: record.bookRow,
      itemRow: record.itemRow,
      sourceCharacterId: record.sourceCharacterId,
      targetCharacterId: record.targetCharacterId,
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

  toRowValues(record: RelationRecord): RelationRawValues {
    return [
      record.id,
      record.itemRow,
      record.sourceCharacterId,
      record.targetCharacterId,
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
