import { describe, expect, it } from 'vitest';
import { LearnFeedDomain, LearnFeedEntry, selectLearnFeedBatch } from './learn-feed.service';

function createEntry(id: string, domain: LearnFeedDomain): LearnFeedEntry {
  return {
    id,
    domain,
    bookName: 'Book',
    bookAuthor: 'Author',
    title: id,
    body: '',
    tags: [],
    sourceRow: {},
  };
}

describe('selectLearnFeedBatch', () => {
  it('includes one available entry per domain before filling the rest', () => {
    const entries = [
      ...Array.from({ length: 30 }, (_, index) => createEntry(`quote-${index}`, 'QUOTES')),
      createEntry('character-relation', 'RELATIONS'),
      createEntry('concept-relation', 'ASSOCIATIONS'),
    ];

    const batch = selectLearnFeedBatch(entries, 20);

    expect(batch.slice(0, 3).map((entry) => entry.domain)).toEqual([
      'QUOTES',
      'RELATIONS',
      'ASSOCIATIONS',
    ]);
    expect(batch).toHaveLength(20);
  });

  it('honors a batch limit smaller than the input', () => {
    const batch = selectLearnFeedBatch(
      [createEntry('quote-1', 'QUOTES'), createEntry('quote-2', 'QUOTES')],
      1,
    );

    expect(batch.map((entry) => entry.id)).toEqual(['quote-1']);
  });

  it('prioritizes unseen and due entries before entries with remaining interval', () => {
    const now = new Date('2026-11-26T12:00:00.000Z');
    const due = createEntry('due', 'CONCEPTS');
    due.sourceRow = {
      lastSeen: new Date('2026-11-24T12:00:00.000Z'),
      interval: 2,
    };
    const notDue = createEntry('not-due', 'QUOTES');
    notDue.sourceRow = {
      lastSeen: new Date('2026-11-26T00:00:00.000Z'),
      interval: 2,
    };
    const unseen = createEntry('unseen', 'PLACES');

    expect(selectLearnFeedBatch([notDue, due, unseen], 3, now).map((entry) => entry.id)).toEqual([
      'due',
      'unseen',
      'not-due',
    ]);
  });
});