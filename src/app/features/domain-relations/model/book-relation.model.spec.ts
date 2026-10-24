import { describe, expect, it } from 'vitest';
import { getRelationTypeSuggestions } from './book-relation.model';

describe('character relation type suggestions', () => {
  it('returns no suggestions when the book has no saved relations', () => {
    expect(getRelationTypeSuggestions([])).toEqual([]);
  });

  it('suggests only distinct, non-empty types already saved for the book', () => {
    expect(
      getRelationTypeSuggestions([
        { relationType: 'friend of' },
        { relationType: ' parent of ' },
        { relationType: 'friend of' },
        { relationType: '   ' },
      ]),
    ).toEqual(['friend of', 'parent of']);
  });
});