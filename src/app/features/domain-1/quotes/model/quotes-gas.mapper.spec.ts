import { describe, expect, it } from 'vitest';
import { QuoteGASMapper } from './quotes-gas.mapper';
import { QuoteRaw, QuoteRecord } from './quotes-model';

const mapper = new QuoteGASMapper();

const raw: QuoteRaw = {
  id: 'quote-1',
  bookId: 'book-1',
  bookRow: 7,
  itemRow: 15,
  quote: 'A quote',
  analysis: 'An analysis',
  book: 'A book',
  author: 'An author',
  page: 42,
  tags: '#one|#two',
  syncStatus: 'synced',
  contributor: 'admin@example.com',
  feed: 3,
};

describe('QuoteGASMapper', () => {
  it('maps raw GAS values to a record keeping bookRow and itemRow distinct', () => {
    const record = mapper.toRecord(raw);

    expect(record).toEqual({
      id: 'quote-1',
      bookId: 'book-1',
      bookRow: 7,
      itemRow: 15,
      quote: 'A quote',
      analysis: 'An analysis',
      book: 'A book',
      author: 'An author',
      page: '42',
      tags: ['#one', '#two'],
      syncStatus: 'synced',
      contributor: 'admin@example.com',
      feed: 3,
    });
  });

  it('falls back to pending for unknown sync statuses and empty values for missing fields', () => {
    const record = mapper.toRecord({
      ...raw,
      syncStatus: 'unknown',
      tags: '',
      page: 0,
      analysis: undefined as unknown as string,
    });

    expect(record.syncStatus).toBe('pending');
    expect(record.tags).toEqual([]);
    expect(record.page).toBe('');
    expect(record.analysis).toBe('');
  });

  it('serializes tags and preserves row metadata in toRaw', () => {
    const record: QuoteRecord = { ...mapper.toRecord(raw), syncStatus: 'pending' };

    expect(mapper.toRaw(record)).toEqual({
      ...raw,
      page: '42',
      syncStatus: 'pending',
    });
  });

  it('round-trips tags and sync status', () => {
    const record = mapper.toRecord(raw);

    expect(mapper.toRecord(mapper.toRaw(record))).toEqual(record);
  });

  it('builds row values in the declared column order', () => {
    expect(mapper.toRowValues(mapper.toRecord(raw))).toEqual([
      'quote-1',
      15,
      'A quote',
      'An analysis',
      'A book',
      'An author',
      '42',
      '#one|#two',
      3,
      'admin@example.com',
      'synced',
    ]);
  });
});
