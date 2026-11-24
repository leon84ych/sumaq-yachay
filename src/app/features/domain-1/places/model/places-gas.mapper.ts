import { Injectable } from '@angular/core';
import { GASMapperInterface } from '../../../../core/infrastructure/gas/gas-mapper-interface';
import { parseSyncStatus } from '../../../../core/infrastructure/gas/gas-utils-mappers.mapper';
import { mapTagsToArray, mapTagsToString } from '../../../../shared/tag-picker/tag-picker.mapper';
import {
  PLACE_DEFAULT_COLOR,
  PLACE_DEFAULT_FEED,
  PlaceRaw,
  PlaceRawValues,
  PlaceRecord,
} from './places-model';

@Injectable({ providedIn: 'root' })
export class PlaceGASMapper implements GASMapperInterface<PlaceRecord, PlaceRaw, PlaceRawValues> {
  toRecord(raw: PlaceRaw): PlaceRecord {
    return {
      id: String(raw.id),
      bookId: raw.bookId ?? '',
      bookRow: Number(raw.bookRow ?? 0),
      itemRow: Number(raw.itemRow ?? 0),
      name: raw.name ?? '',
      type: raw.type ?? 'city',
      nature: raw.nature ?? 'real',
      coordinates: raw.coordinates,
      color: raw.color || PLACE_DEFAULT_COLOR,
      description: raw.description,
      source: raw.source,
      tags: mapTagsToArray(raw.tags),
      feed: Number(raw.feed ?? PLACE_DEFAULT_FEED),
      contributor: raw.contributor ?? '',
      syncStatus: parseSyncStatus(raw.syncStatus),
    };
  }

  toRaw(record: PlaceRecord): PlaceRaw {
    return {
      id: record.id,
      bookId: record.bookId,
      bookRow: record.bookRow,
      itemRow: record.itemRow,
      name: record.name,
      type: record.type,
      nature: record.nature,
      coordinates: record.coordinates,
      color: record.color,
      description: record.description,
      source: record.source,
      tags: mapTagsToString(record.tags),
      feed: record.feed,
      contributor: record.contributor,
      syncStatus: record.syncStatus,
    };
  }

  toRowValues(record: PlaceRecord): PlaceRawValues {
    return [
      record.id,
      record.itemRow,
      record.name,
      record.type,
      record.nature,
      record.coordinates ?? '',
      record.color,
      record.description ?? '',
      record.source ?? '',
      mapTagsToString(record.tags),
      record.feed,
      record.contributor,
      record.syncStatus,
    ];
  }
}
