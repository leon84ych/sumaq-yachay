import { Injectable } from '@angular/core';
import { GASMapperInterface } from '../../../../core/infrastructure/gas/gas-mapper-interface';
import { parseSyncStatus } from '../../../../core/infrastructure/gas/gas-utils-mappers.mapper';
import { mapTagsToArray, mapTagsToString } from '../../../../shared/tag-picker/tag-picker.mapper';
import {
  PASSAGE_DEFAULT_FEED,
  PassageRaw,
  PassageRawValues,
  PassageRecord,
} from './passages-model';

@Injectable({
  providedIn: 'root',
})
export class PassageGASMapper
  implements GASMapperInterface<PassageRecord, PassageRaw, PassageRawValues>
{
  toRecord(raw: PassageRaw): PassageRecord {
    return {
      id: String(raw.id),
      bookId: raw.bookId,
      bookRow: Number(raw.bookRow ?? 0),
      itemRow: Number(raw.itemRow ?? 0),
      title: raw.title ?? '',
      passageText: raw.passageText ?? '',
      book: raw.book ?? '',
      author: raw.author ?? '',
      // GAS returns 0/empty for passages without a page.
      page: raw.page === 0 ? '' : String(raw.page ?? ''),
      tags: mapTagsToArray(raw.tags),
      syncStatus: parseSyncStatus(raw.syncStatus),
      contributor: raw.contributor ?? '',
      feed: Number(raw.feed ?? PASSAGE_DEFAULT_FEED),
    };
  }

  toRaw(record: PassageRecord): PassageRaw {
    return {
      id: record.id,
      bookId: record.bookId,
      bookRow: record.bookRow,
      itemRow: record.itemRow,
      title: record.title,
      passageText: record.passageText,
      book: record.book,
      author: record.author,
      page: record.page,
      tags: mapTagsToString(record.tags),
      syncStatus: record.syncStatus,
      contributor: record.contributor,
      feed: record.feed,
    };
  }

  toRowValues(record: PassageRecord): PassageRawValues {
    return [
      record.id,
      record.itemRow,
      record.title,
      record.passageText,
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
