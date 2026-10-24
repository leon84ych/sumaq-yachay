import { describe, expect, it } from 'vitest';
import {
  ALL_AVAILABLE_DOMAINS,
  DOMAIN_DEFINITIONS,
  DOMAIN_TAB_ORDER,
  getDefaultHeadersForDomain,
  sortDomainTabs,
} from './domain-sheet-config';

describe('domain sheet configuration', () => {
  it('keeps all supported domains and their default headers in one registry', () => {
    expect(new Set(ALL_AVAILABLE_DOMAINS)).toEqual(
      new Set([
        'INDEX',
        'QUOTES',
        'CONCEPTS',
        'PASSAGES',
        'CHARACTER',
        'PLACES',
        'BOOK_EVENTS',
        'RELATIONS',
        'ASSOCIATIONS',
        'GLOSARY',
        'QUESTIONS',
      ]),
    );
    expect(DOMAIN_DEFINITIONS.INDEX.headers).toEqual([
      'id',
      'chapter',
      'theme',
      'subtheme',
      'tags',
      'syncStatus',
    ]);
    expect(DOMAIN_DEFINITIONS.QUOTES.headers).toContain('tags');
    expect(DOMAIN_DEFINITIONS.CONCEPTS.headers).toContain('source');
    expect(DOMAIN_DEFINITIONS.BOOK_EVENTS.headers).toEqual([
      'id',
      'mainCharacterId',
      'secondaryCharacterIds',
      'placeId',
      'dateTimeStart',
      'dateTimeEnd',
      'dateLabel',
      'eventOrder',
      'event',
      'description',
      'color',
      'book',
      'author',
      'page',
      'tags',
      'feed',
      'contributor',
      'syncStatus',
    ]);
    expect(DOMAIN_DEFINITIONS.RELATIONS.headers).toEqual([
      'id',
      'sourceCharacterId',
      'targetCharacterId',
      'relationType',
      'directed',
      'description',
      'color',
      'book',
      'author',
      'page',
      'tags',
      'feed',
      'contributor',
      'syncStatus',
    ]);
    expect(DOMAIN_DEFINITIONS.ASSOCIATIONS.headers).toEqual([
      'id',
      'sourceConceptId',
      'targetConceptId',
      'relationType',
      'directed',
      'description',
      'color',
      'book',
      'author',
      'page',
      'tags',
      'feed',
      'contributor',
      'syncStatus',
    ]);
    expect(getDefaultHeadersForDomain('book_events')).toEqual(
      DOMAIN_DEFINITIONS.BOOK_EVENTS.headers,
    );
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
    expect(DOMAIN_DEFINITIONS.CHARACTER.headers).toEqual([
      'id',
      'name',
      'role',
      'nature',
      'description',
      'archetype',
      'color',
      'source',
      'tags',
      'feed',
      'contributor',
      'syncStatus',
    ]);
    expect(DOMAIN_DEFINITIONS.GLOSARY.headers).toEqual([
      'id',
      'term',
      'definition',
      'partOfSpeech',
      'etymology',
      'synonyms',
      'contextSentence',
      'source',
      'page',
      'tags',
      'feed',
      'contributor',
      'syncStatus',
    ]);
    expect(DOMAIN_DEFINITIONS.QUESTIONS.headers).toEqual([
      'id',
      'question',
      'answer',
      'type',
      'options',
      'sourceDomain',
      'sourceRowId',
      'sourceTerm',
      'bookRow',
      'bookName',
      'page',
      'difficulty',
      'aiGenerated',
      'tags',
      'feed',
      'contributor',
      'syncStatus',
    ]);
  });

  it('normalizes domain names when retrieving headers', () => {
    expect(getDefaultHeadersForDomain('quotes')).toEqual(DOMAIN_DEFINITIONS.QUOTES.headers);
  });

  it('defines the catalog tab order in one typed configuration', () => {
    expect(DOMAIN_TAB_ORDER).toEqual([
      'INDEX',
      'CHARACTER',
      'RELATIONS',
      'CONCEPTS',
      'ASSOCIATIONS',
      'PLACES',
      'BOOK_EVENTS',
      'QUOTES',
      'PASSAGES',
      'GLOSARY',
      'QUESTIONS',
    ]);
  });

  it('orders configured tabs before custom tabs without dropping empty sheets', () => {
    const sorted = sortDomainTabs([
      { name: 'QUOTES', index: 0, rows: [{ id: 'quote-1' }] },
      { name: 'ASSOCIATIONS', index: 1, rows: [] },
      { name: 'CHARACTER', index: 2, rows: [{ id: 'character-1' }] },
      { name: 'Custom Notes', index: 3, rows: [] },
      { name: 'INDEX', index: 4, rows: [] },
    ]);

    expect(sorted.map((sheet) => sheet.name)).toEqual([
      'INDEX',
      'CHARACTER',
      'ASSOCIATIONS',
      'QUOTES',
      'Custom Notes',
    ]);
    expect(sorted[0].rows).toEqual([]);
    expect(sorted[2].rows).toEqual([]);
  });

  it('keeps custom tabs in server order after configured tabs', () => {
    const sorted = sortDomainTabs([
      { name: 'Notes 2', index: 4 },
      { name: 'Notes 1', index: 2 },
      { name: 'CONCEPTS', index: 0 },
    ]);

    expect(sorted.map((sheet) => sheet.name)).toEqual(['CONCEPTS', 'Notes 1', 'Notes 2']);
  });
});
