export type DomainName =
  | 'INDEX'
  | 'CONCEPTS'
  | 'QUOTES'
  | 'PASSAGES'
  | 'CHARACTER'
  | 'PLACES'
  | 'BOOK_EVENTS'
  | 'RELATIONS_CHARACTERS'
  | 'RELATIONS_CONCEPTS'
  | 'GLOSARY'
  | 'QUESTIONS';

export interface DomainDefinition {
  headers: readonly string[];
}

export const DOMAIN_DEFINITIONS: Record<DomainName, DomainDefinition> = {
  INDEX: {
    headers: ['id', 'chapter', 'theme', 'subtheme', 'tags', 'syncStatus'],
  },
  CONCEPTS: {
    headers: ['id', 'term', 'definition', 'category', 'source', 'tags', 'syncStatus'],
  },
  QUOTES: {
    headers: ['id', 'quote', 'analysis', 'author', 'page', 'tags', 'syncStatus'],
  },
  PASSAGES: {
    headers: [
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
    ],
  },
  CHARACTER: {
    headers: [
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
    ],
  },
  PLACES: {
    headers: [
      'id',
      'name',
      'type',
      'nature',
      'coordinates',
      'color',
      'description',
      'source',
      'tags',
      'feed',
      'contributor',
      'syncStatus',
    ],
  },
  BOOK_EVENTS: {
    headers: [
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
    ],
  },
  RELATIONS_CHARACTERS: {
    headers: [
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
    ],
  },
  RELATIONS_CONCEPTS: {
    headers: [
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
    ],
  },
  GLOSARY: {
    headers: [
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
    ],
  },
  QUESTIONS: {
    headers: [
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
    ],
  },
};

export const DOMAIN_TAB_ORDER: readonly DomainName[] = [
  'INDEX',
  'CHARACTER',
  'RELATIONS_CHARACTERS',
  'CONCEPTS',
  'RELATIONS_CONCEPTS',
  'PLACES',
  'BOOK_EVENTS',
  'QUOTES',
  'PASSAGES',
  'GLOSARY',
  'QUESTIONS',
];

const DOMAIN_TAB_ORDER_INDEX = new Map<string, number>(
  DOMAIN_TAB_ORDER.map((domain, index) => [domain, index]),
);

interface SheetTabOrder {
  name: string;
  index: number;
}

export function sortDomainTabs<T extends SheetTabOrder>(sheets: readonly T[]): T[] {
  return [...sheets].sort((a, b) => {
    const aOrder = DOMAIN_TAB_ORDER_INDEX.get(a.name.toUpperCase());
    const bOrder = DOMAIN_TAB_ORDER_INDEX.get(b.name.toUpperCase());

    if (aOrder !== undefined && bOrder !== undefined) {
      return aOrder - bOrder || a.index - b.index;
    }
    if (aOrder !== undefined) {
      return -1;
    }
    if (bOrder !== undefined) {
      return 1;
    }

    return a.index - b.index;
  });
}

export const ALL_AVAILABLE_DOMAINS = Object.keys(DOMAIN_DEFINITIONS) as DomainName[];

export function getDefaultHeadersForDomain(domain: string): readonly string[] {
  const normalizedDomain = domain.toUpperCase() as DomainName;
  return DOMAIN_DEFINITIONS[normalizedDomain]?.headers ?? ['id', 'tag', 'syncStatus'];
}
