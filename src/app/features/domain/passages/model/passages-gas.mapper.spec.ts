import { describe, expect, it } from 'vitest';
import { PassageGASMapper } from './passages-gas.mapper';
import { PassageRaw, PassageRecord } from './passages-model';

const mapper = new PassageGASMapper();

const raw: PassageRaw = {
  id: 'passage-1',
  bookId: 'book-1',
  bookRow: 7,
  itemRow: 15,
  title: 'A title',
  passageText: 'A long passage',
  book: 'A book',
  author: 'An author',
  page: 42,
  tags: '#one|#two',
  syncStatus: 'synced',
  contributor: 'admin@example.com',
  feed: 3,
};

describe('PassageGASMapper', () => {
  it('maps raw GAS values to a record keeping bookRow and itemRow distinct', () => {
    expect(mapper.toRecord(raw)).toEqual({
      id: 'passage-1',
      bookId: 'book-1',
      bookRow: 7,
      itemRow: 15,
      title: 'A title',
      passageText: 'A long passage',
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
      feed: undefined as unknown as number,
      title: undefined as unknown as string,
    });

    expect(record.syncStatus).toBe('pending');
    expect(record.tags).toEqual([]);
    expect(record.page).toBe('');
    expect(record.title).toBe('');
    expect(record.feed).toBe(5);
  });

  it('serializes tags and preserves identity and row metadata in toRaw', () => {
    const record: PassageRecord = { ...mapper.toRecord(raw), syncStatus: 'pending' };

    expect(mapper.toRaw(record)).toEqual({ ...raw, page: '42', syncStatus: 'pending' });
  });

  it('round-trips tags and sync status', () => {
    const record = mapper.toRecord(raw);

    expect(mapper.toRecord(mapper.toRaw(record))).toEqual(record);
  });

  it('builds row values in the declared column order', () => {
    expect(mapper.toRowValues(mapper.toRecord(raw))).toEqual([
      'passage-1',
      15,
      'A title',
      'A long passage',
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
