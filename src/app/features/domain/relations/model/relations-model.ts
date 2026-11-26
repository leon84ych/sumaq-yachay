import { Feed } from '../../shared/model/domain-shared-model';

export interface RelationRaw {
  id: string;
  bookId: string;
  bookRow: number;
  itemRow: number;
  sourceCharacterId: string;
  targetCharacterId: string;
  relationType: string;
  directed: boolean | string;
  description: string;
  color: string;
  book: string;
  author: string;
  page: string;
  tags: string;
  feed: number;
  contributor: string;
  syncStatus: string;
}

export interface RelationRecord extends Feed {
  sourceCharacterId: string;
  targetCharacterId: string;
  relationType: string;
  directed: boolean;
  description: string;
  color: string;
  book: string;
  author: string;
  page: string;
  feed: number;
}

export type RelationRawValues = [
  string,
  number,
  string,
  string,
  string,
  boolean,
  string,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  string,
];

export const RELATION_DEFAULT_COLOR = '#D4A373';
export const RELATION_DEFAULT_FEED = 5;

export function getRelationTypeSuggestions(
  relations: readonly Pick<RelationRecord, 'relationType'>[],
): string[] {
  return [...new Set(relations.map((relation) => relation.relationType.trim()).filter(Boolean))];
}
