import { describe, expect, it } from 'vitest';
import { getConceptRelationTypeSuggestions } from './book-relation-concept.model';

describe('concept relation type suggestions', () => {
  it('returns no suggestions when the book has no saved concept relations', () => {
    expect(getConceptRelationTypeSuggestions([])).toEqual([]);
  });

  it('suggests only distinct, non-empty types already saved for the book', () => {
    expect(
      getConceptRelationTypeSuggestions([
        { relationType: 'causes' },
        { relationType: ' related to ' },
        { relationType: 'causes' },
        { relationType: '   ' },
      ]),
    ).toEqual(['causes', 'related to']);
  });
});
