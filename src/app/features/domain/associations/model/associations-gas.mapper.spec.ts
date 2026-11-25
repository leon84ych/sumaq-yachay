import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AssociationGASMapper } from './associations-gas.mapper';
import {
  AssociationRaw,
  AssociationRecord,
  getAssociationTypeSuggestions,
} from './associations-model';

describe('AssociationGASMapper', () => {
  let mapper: AssociationGASMapper;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    mapper = TestBed.inject(AssociationGASMapper);
  });

  it('maps tags and status while retaining distinct row identifiers', () => {
    const raw: AssociationRaw = {
      id: 'association-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 24,
      sourceConceptId: 'concept-a',
      targetConceptId: 'concept-b',
      relationType: 'causes',
      directed: 'true',
      description: 'One concept gives rise to the other.',
      color: '#735D78',
      book: 'Book One',
      author: 'Author One',
      page: '18-20',
      tags: '#causality|#theory',
      feed: 4,
      contributor: 'reader@example.com',
      syncStatus: 'synced',
    };

    expect(mapper.toRecord(raw)).toMatchObject({
      bookRow: 8,
      itemRow: 24,
      directed: true,
      tags: ['#causality', '#theory'],
      syncStatus: 'synced',
    });
  });

  it('serializes every business and transport field to GAS', () => {
    const record: AssociationRecord = {
      id: 'association-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 24,
      sourceConceptId: 'concept-a',
      targetConceptId: 'concept-b',
      relationType: 'causes',
      directed: true,
      description: 'One concept gives rise to the other.',
      color: '#735D78',
      book: 'Book One',
      author: 'Author One',
      page: '18-20',
      tags: ['#causality', '#theory'],
      feed: 4,
      contributor: 'reader@example.com',
      syncStatus: 'pending',
    };

    expect(mapper.toRaw(record)).toMatchObject({
      id: 'association-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 24,
      sourceConceptId: 'concept-a',
      targetConceptId: 'concept-b',
      tags: '#causality|#theory',
      syncStatus: 'pending',
    });
  });

  it('returns unique non-empty association type suggestions in first-seen order', () => {
    expect(
      getAssociationTypeSuggestions([
        { relationType: 'causes' },
        { relationType: ' related to ' },
        { relationType: 'causes' },
        { relationType: '   ' },
      ]),
    ).toEqual(['causes', 'related to']);
  });
});
