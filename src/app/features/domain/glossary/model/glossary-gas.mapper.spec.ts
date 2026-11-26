import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { GlossaryGASMapper } from './glossary-gas.mapper';
import { GlossaryRaw, GlossaryRecord } from './glossary-model';

describe('GlossaryGASMapper', () => {
  let mapper: GlossaryGASMapper;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    mapper = TestBed.inject(GlossaryGASMapper);
  });

  it('maps tags, status, page values, and distinct book and item rows', () => {
    const raw: GlossaryRaw = {
      id: 'term-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 19,
      term: 'Logos',
      language: 'Ancient Greek',
      definition: 'A principle of reason.',
      partOfSpeech: 'Noun',
      page: 42,
      tags: '#reason|#language',
      feed: 3,
      contributor: 'reader@example.com',
      syncStatus: 'synced',
    };

    expect(mapper.toRecord(raw)).toMatchObject({
      id: 'term-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 19,
      page: '42',
      tags: ['#reason', '#language'],
      language: 'Ancient Greek',
      syncStatus: 'synced',
    });
  });

  it('serializes every business and transport field to the GAS raw shape', () => {
    const record: GlossaryRecord = {
      id: 'term-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 19,
      term: 'Logos',
      language: 'Ancient Greek',
      definition: 'A principle of reason.',
      partOfSpeech: 'Noun',
      etymology: 'Greek',
      synonyms: 'reason',
      contextSentence: 'The logos guides the argument.',
      source: 'Metaphysics',
      page: '42',
      tags: ['#reason', '#language'],
      feed: 3,
      contributor: 'reader@example.com',
      syncStatus: 'pending',
    };

    expect(mapper.toRaw(record)).toEqual({
      id: 'term-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 19,
      term: 'Logos',
      language: 'Ancient Greek',
      definition: 'A principle of reason.',
      partOfSpeech: 'Noun',
      etymology: 'Greek',
      synonyms: 'reason',
      contextSentence: 'The logos guides the argument.',
      source: 'Metaphysics',
      page: '42',
      tags: '#reason|#language',
      feed: 3,
      contributor: 'reader@example.com',
      syncStatus: 'pending',
    });
  });

  it('serializes language in the GLOSARY sheet column order', () => {
    const record: GlossaryRecord = {
      id: 'term-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 19,
      term: 'Logos',
      language: 'Ancient Greek',
      definition: 'A principle of reason.',
      tags: [],
      feed: 3,
      contributor: 'reader@example.com',
      syncStatus: 'pending',
    };

    expect(mapper.toRowValues(record)).toEqual([
      'term-1', 19, 'Logos', 'Ancient Greek', 'A principle of reason.',
      '', '', '', '', '', '', '', 3, 'reader@example.com', 'pending',
    ]);
  });
});
