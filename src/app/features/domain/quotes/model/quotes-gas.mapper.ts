import { Injectable } from '@angular/core';
import { GASMapperInterface } from '../../../../core/infrastructure/gas/gas-mapper-interface';
import { parseSyncStatus } from '../../../../core/infrastructure/gas/gas-utils-mappers.mapper';
import { mapTagsToArray, mapTagsToString } from '../../../../shared/tag-picker/tag-picker.mapper';
import { QUOTE_DEFAULT_FEED, QuoteRaw, QuoteRawValues, QuoteRecord } from './quotes-model';

@Injectable({
  providedIn: 'root',
})
export class QuoteGASMapper implements GASMapperInterface<QuoteRecord, QuoteRaw, QuoteRawValues> {
  toRecord(raw: QuoteRaw): QuoteRecord {
    return {
      id: String(raw.id),
      bookId: raw.bookId,
      bookRow: Number(raw.bookRow ?? 0),
      itemRow: Number(raw.itemRow ?? 0),
      quote: raw.quote ?? '',
      analysis: raw.analysis ?? '',
      book: raw.book ?? '',
      author: raw.author ?? '',
      // GAS returns 0/empty for quotes without a page.
      page: raw.page === 0 ? '' : String(raw.page ?? ''),
      tags: mapTagsToArray(raw.tags),
      syncStatus: parseSyncStatus(raw.syncStatus),
      contributor: raw.contributor ?? '',
      feed: Number(raw.feed ?? QUOTE_DEFAULT_FEED),
    };
  }

  toRaw(record: QuoteRecord): QuoteRaw {
    return {
      id: record.id,
      bookId: record.bookId,
      bookRow: record.bookRow,
      itemRow: record.itemRow,
      quote: record.quote,
      analysis: record.analysis,
      book: record.book,
      author: record.author,
      page: record.page,
      tags: mapTagsToString(record.tags),
      syncStatus: record.syncStatus,
      contributor: record.contributor,
      feed: record.feed,
    };
  }

  toRowValues(record: QuoteRecord): QuoteRawValues {
    return [
      record.id,
      record.itemRow,
      record.quote,
      record.analysis,
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
