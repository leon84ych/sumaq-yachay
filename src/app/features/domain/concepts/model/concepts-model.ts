import { Domain } from '../../shared/model/domain-shared-model';

/**
 * Raw representation of a concept as returned by the GAS backend
 */
export interface ConceptRaw {
  id: string;
  bookId: string;
  bookRow: number;
  itemRow: number;
  term: string;
  definition: string;
  category: string;
  source: string;
  tags: string;
  syncStatus: string;
  contributor: string;
  feed: number;
}

/**
 * Specific record model for domain concepts
 */
export interface ConceptRecord extends Domain {
  term: string;
  definition: string;
  category: string;
  source: string;
  feed: number;
}

export type ConceptRawValues = [
  string, //id
  number, //itemRow
  string, //term
  string, //definition
  string, //category
  string, //source
  string, //tags
  number, //feed
  string, //contributor
  string, //syncStatus
];

export const CONCEPT_DEFAULT_FEED = 5;

export const CONCEPT_NODE_CATEGORIES = [
  'theory-model',
  'phenomenon-process',
  'principle-axiom',
  'paradigm-school',
  'technical-construct',
  'other',
] as const;

export type ConceptNodeCategory = (typeof CONCEPT_NODE_CATEGORIES)[number];

export function isConceptNodeCategory(category: string | undefined): boolean {
  return CONCEPT_NODE_CATEGORIES.includes(category as ConceptNodeCategory);
}
