import { describe, expect, it } from 'vitest';
import { ConceptGASMapper } from './concepts-gas.mapper';
import { ConceptRaw, ConceptRecord } from './concepts-model';

const mapper = new ConceptGASMapper();

const raw: ConceptRaw = {
  id: 'concept-1',
  bookId: 'book-1',
  bookRow: 7,
  itemRow: 15,
  term: 'Eternal return',
  definition: 'The same life repeats infinitely.',
  category: 'principle-axiom',
  source: 'Zaratustra',
  tags: '#one|#two',
  syncStatus: 'synced',
  contributor: 'admin@example.com',
  feed: 3,
};

describe('ConceptGASMapper', () => {
  it('maps raw GAS values to a record keeping bookRow and itemRow distinct', () => {
    expect(mapper.toRecord(raw)).toEqual({
      id: 'concept-1',
      bookId: 'book-1',
      bookRow: 7,
      itemRow: 15,
      term: 'Eternal return',
      definition: 'The same life repeats infinitely.',
      category: 'principle-axiom',
      source: 'Zaratustra',
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
      category: undefined as unknown as string,
      source: undefined as unknown as string,
      feed: undefined as unknown as number,
    });

    expect(record.syncStatus).toBe('pending');
    expect(record.tags).toEqual([]);
    expect(record.category).toBe('');
    expect(record.source).toBe('');
    expect(record.feed).toBe(5);
  });

  it('serializes tags and preserves row metadata in toRaw', () => {
    const record: ConceptRecord = { ...mapper.toRecord(raw), syncStatus: 'pending' };

    expect(mapper.toRaw(record)).toEqual({ ...raw, syncStatus: 'pending' });
  });

  it('round-trips tags and sync status', () => {
    const record = mapper.toRecord(raw);

    expect(mapper.toRecord(mapper.toRaw(record))).toEqual(record);
  });

  it('builds row values in the declared column order', () => {
    expect(mapper.toRowValues(mapper.toRecord(raw))).toEqual([
      'concept-1',
      15,
      'Eternal return',
      'The same life repeats infinitely.',
      'principle-axiom',
      'Zaratustra',
      '#one|#two',
      3,
      'admin@example.com',
      'synced',
    ]);
  });
});
