import { describe, expect, it } from 'vitest';
import { getAssociationTypeSuggestions } from './book-association.model';

describe('association type suggestions', () => {
  it('returns no suggestions when the book has no saved associations', () => {
    expect(getAssociationTypeSuggestions([])).toEqual([]);
  });

  it('suggests only distinct, non-empty types already saved for the book', () => {
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
