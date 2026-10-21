import { describe, expect, it } from 'vitest';
import { DomainName } from '../../catalog-detail/models/domain-sheet-config';
import { LearnFeedEntry, selectLearnFeedBatch } from './learn-feed.service';

function createEntry(id: string, domain: DomainName): LearnFeedEntry {
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
      createEntry('character-relation', 'RELATIONS_CHARACTERS'),
      createEntry('concept-relation', 'RELATIONS_CONCEPTS'),
    ];

    const batch = selectLearnFeedBatch(entries, 20);

    expect(batch.slice(0, 3).map((entry) => entry.domain)).toEqual([
      'QUOTES',
      'RELATIONS_CHARACTERS',
      'RELATIONS_CONCEPTS',
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
});