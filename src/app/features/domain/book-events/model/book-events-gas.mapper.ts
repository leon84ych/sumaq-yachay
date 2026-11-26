import { Injectable } from '@angular/core';
import { GASMapperInterface } from '../../../../core/infrastructure/gas/gas-mapper-interface';
import { parseSyncStatus } from '../../../../core/infrastructure/gas/gas-utils-mappers.mapper';
import { mapTagsToArray, mapTagsToString } from '../../../../shared/tag-picker/tag-picker.mapper';
import {
  BOOK_EVENT_DEFAULT_COLOR,
  BOOK_EVENT_DEFAULT_FEED,
  BookEventRaw,
  BookEventRawValues,
  BookEventRecord,
} from './book-events-model';

@Injectable({ providedIn: 'root' })
export class BookEventGASMapper implements GASMapperInterface<
  BookEventRecord,
  BookEventRaw,
  BookEventRawValues
> {
  toRecord(raw: BookEventRaw): BookEventRecord {
    const secondaryCharacterIds = Array.isArray(raw.secondaryCharacterIds)
      ? raw.secondaryCharacterIds.map(String)
      : typeof raw.secondaryCharacterIds === 'string'
        ? raw.secondaryCharacterIds.split(/[,;\s]+/).filter(Boolean)
        : [];

    return {
      id: String(raw.id),
      bookId: raw.bookId ?? '',
      bookRow: Number(raw.bookRow ?? 0),
      itemRow: Number(raw.itemRow ?? 0),
      mainCharacterId: raw.mainCharacterId ?? '',
      secondaryCharacterIds,
      placeId: this.optionalString(raw.placeId),
      dateTimeStart: this.optionalString(raw.dateTimeStart),
      dateTimeEnd: this.optionalString(raw.dateTimeEnd),
      dateLabel: this.optionalString(raw.dateLabel),
      eventOrder: Number(raw.eventOrder ?? 0),
      event: raw.event ?? '',
      description: raw.description ?? '',
      color: raw.color ?? BOOK_EVENT_DEFAULT_COLOR,
      book: raw.book ?? '',
      author: raw.author ?? '',
      page: raw.page ?? '',
      tags: mapTagsToArray(raw.tags),
      feed: Number(raw.feed ?? BOOK_EVENT_DEFAULT_FEED),
      contributor: raw.contributor ?? '',
      syncStatus: parseSyncStatus(raw.syncStatus),
    };
  }

  toRaw(record: BookEventRecord): BookEventRaw {
    return {
      id: record.id,
      bookId: record.bookId,
      bookRow: record.bookRow,
      itemRow: record.itemRow,
      mainCharacterId: record.mainCharacterId,
      secondaryCharacterIds: record.secondaryCharacterIds,
      placeId: record.placeId,
      dateTimeStart: record.dateTimeStart,
      dateTimeEnd: record.dateTimeEnd,
      dateLabel: record.dateLabel,
      eventOrder: record.eventOrder,
      event: record.event,
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

  toRowValues(record: BookEventRecord): BookEventRawValues {
    return [
      record.id,
      record.itemRow,
      record.mainCharacterId,
      record.secondaryCharacterIds,
      record.placeId ?? '',
      record.dateTimeStart ?? '',
      record.dateTimeEnd ?? '',
      record.dateLabel ?? '',
      record.eventOrder,
      record.event,
      record.description,
      record.color,
      record.book,
      record.feed,
      record.contributor,
      record.syncStatus,
    ];
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }
}
