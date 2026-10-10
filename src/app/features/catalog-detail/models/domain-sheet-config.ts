export type DomainName =
  | 'INDEX'
  | 'CONCEPTS'
  | 'QUOTES'
  | 'PASSAGES'
  | 'CHARACTER'
  | 'PLACES'
  | 'TIMELINE'
  | 'RELATIONS'
  | 'GLOSARY'
  | 'QUESTIONS';

export interface DomainDefinition {
  headers: readonly string[];
}

export const DOMAIN_DEFINITIONS: Record<DomainName, DomainDefinition> = {
  INDEX: {
    headers: ['id', 'chapter', 'theme', 'subtheme', 'tag', 'syncStatus'],
  },
  CONCEPTS: {
    headers: ['id', 'term', 'definition', 'category', 'source', 'syncStatus'],
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
    headers: ['id', 'name', 'type', 'nature', 'coordinates', 'color', 'description', 'source', 'tags', 'feed', 'contributor', 'syncStatus'],
  },
  TIMELINE: {
    headers: ['id', 'date', 'event', 'description', 'significance', 'syncStatus'],
  },
  RELATIONS: {
    headers: ['id', 'sourceNode', 'targetNode', 'relationshipType', 'weight', 'syncStatus'],
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

export const ALL_AVAILABLE_DOMAINS = Object.keys(DOMAIN_DEFINITIONS) as DomainName[];

export function getDefaultHeadersForDomain(domain: string): readonly string[] {
  const normalizedDomain = domain.toUpperCase() as DomainName;
  return DOMAIN_DEFINITIONS[normalizedDomain]?.headers ?? ['id', 'tag', 'syncStatus'];
}
