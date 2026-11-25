import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { RelationGASMapper } from './relations-gas.mapper';
import { RelationRaw, RelationRecord, getRelationTypeSuggestions } from './relations-model';

describe('RelationGASMapper', () => {
  let mapper: RelationGASMapper;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    mapper = TestBed.inject(RelationGASMapper);
  });

  it('maps tags and status while retaining distinct row identifiers', () => {
    const raw: RelationRaw = {
      id: 'relation-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 22,
      sourceCharacterId: 'character-a',
      targetCharacterId: 'character-b',
      relationType: 'parent of',
      directed: 'true',
      description: 'A parent-child relationship.',
      color: '#D4A373',
      book: 'Book One',
      author: 'Author One',
      page: '42',
      tags: '#family|#history',
      feed: 5,
      contributor: 'reader@example.com',
      syncStatus: 'synced',
    };

    expect(mapper.toRecord(raw)).toMatchObject({
      bookRow: 8,
      itemRow: 22,
      directed: true,
      tags: ['#family', '#history'],
      syncStatus: 'synced',
    });
  });

  it('serializes every business and transport field to GAS', () => {
    const record: RelationRecord = {
      id: 'relation-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 22,
      sourceCharacterId: 'character-a',
      targetCharacterId: 'character-b',
      relationType: 'parent of',
      directed: true,
      description: 'A parent-child relationship.',
      color: '#D4A373',
      book: 'Book One',
      author: 'Author One',
      page: '42',
      tags: ['#family', '#history'],
      feed: 5,
      contributor: 'reader@example.com',
      syncStatus: 'pending',
    };

    expect(mapper.toRaw(record)).toMatchObject({
      id: 'relation-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 22,
      sourceCharacterId: 'character-a',
      targetCharacterId: 'character-b',
      tags: '#family|#history',
      syncStatus: 'pending',
    });
  });

  it('returns unique non-empty relation-type suggestions in first-seen order', () => {
    expect(
      getRelationTypeSuggestions([
        { relationType: 'friend of' },
        { relationType: ' parent of ' },
        { relationType: 'friend of' },
        { relationType: '  ' },
      ]),
    ).toEqual(['friend of', 'parent of']);
  });
});
