import { describe, expect, it } from 'vitest';
import {
  ALL_AVAILABLE_DOMAINS,
  DOMAIN_DEFINITIONS,
  getDefaultHeadersForDomain,
} from './domain-sheet-config';

describe('domain sheet configuration', () => {
  it('keeps all supported domains and their default headers in one registry', () => {
    expect(new Set(ALL_AVAILABLE_DOMAINS)).toEqual(
      new Set([
        'INDEX',
        'QUOTES',
        'CONCEPTS',
        'PASSAGES',
        'TIMELINE',
        'RELATIONS',
        'GLOSARY',
        'QUESTIONS',
      ])
    );
    expect(DOMAIN_DEFINITIONS.QUOTES.headers).toContain('tags');
    expect(DOMAIN_DEFINITIONS.CONCEPTS.headers).toContain('source');
    expect(DOMAIN_DEFINITIONS.PASSAGES.headers).toEqual([
      'id',
      'title',
      'passageText',
      'book',
      'author',
      'page',
      'tags',
      'feed',
      'contributor',
      'syncStatus',
    ]);
  });

  it('normalizes domain names when retrieving headers', () => {
    expect(getDefaultHeadersForDomain('quotes')).toEqual(
      DOMAIN_DEFINITIONS.QUOTES.headers
    );
  });
});
