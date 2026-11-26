import { Injectable } from '@angular/core';
import { GASMapperInterface } from '../../../../core/infrastructure/gas/gas-mapper-interface';
import { parseSyncStatus } from '../../../../core/infrastructure/gas/gas-utils-mappers.mapper';
import { mapTagsToArray, mapTagsToString } from '../../../../shared/tag-picker/tag-picker.mapper';
import {
  CHARACTER_DEFAULT_FEED,
  CharacterRaw,
  CharacterRawValues,
  CharacterRecord,
} from './characters-model';

@Injectable({ providedIn: 'root' })
export class CharacterGASMapper implements GASMapperInterface<
  CharacterRecord,
  CharacterRaw,
  CharacterRawValues
> {
  toRecord(raw: CharacterRaw): CharacterRecord {
    return {
      id: String(raw.id),
      bookId: raw.bookId ?? '',
      bookRow: Number(raw.bookRow ?? 0),
      itemRow: Number(raw.itemRow ?? 0),
      name: raw.name ?? '',
      role: raw.role ?? 'supporting',
      nature: raw.nature,
      description: raw.description,
      archetype: raw.archetype,
      color: raw.color,
      source: raw.source,
      tags: mapTagsToArray(raw.tags),
      feed: Number(raw.feed ?? CHARACTER_DEFAULT_FEED),
      contributor: raw.contributor ?? '',
      syncStatus: parseSyncStatus(raw.syncStatus),
    };
  }

  toRaw(record: CharacterRecord): CharacterRaw {
    return {
      id: record.id,
      bookId: record.bookId,
      bookRow: record.bookRow,
      itemRow: record.itemRow,
      name: record.name,
      role: record.role,
      nature: record.nature,
      description: record.description,
      archetype: record.archetype,
      color: record.color,
      source: record.source,
      tags: mapTagsToString(record.tags),
      feed: record.feed,
      contributor: record.contributor,
      syncStatus: record.syncStatus,
    };
  }

  toRowValues(record: CharacterRecord): CharacterRawValues {
    return [
      record.id,
      record.itemRow,
      record.name,
      record.role,
      record.nature ?? '',
      record.description ?? '',
      record.archetype ?? '',
      record.color ?? '',
      record.source ?? '',
      mapTagsToString(record.tags),
      record.feed,
      record.contributor,
      record.syncStatus,
    ];
  }
}
