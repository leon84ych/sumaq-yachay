import { Feed } from '../../shared/model/domain-shared-model';

export interface AssociationRaw {
  id: string;
  bookId: string;
  bookRow: number;
  itemRow: number;
  sourceConceptId: string;
  targetConceptId: string;
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

export interface AssociationRecord extends Feed {
  sourceConceptId: string;
  targetConceptId: string;
  relationType: string;
  directed: boolean;
  description: string;
  color: string;
  book: string;
  author: string;
  page: string;
  feed: number;
}

export type AssociationRawValues = [
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

export const ASSOCIATION_DEFAULT_COLOR = '#735D78';
export const ASSOCIATION_DEFAULT_FEED = 5;

export function getAssociationTypeSuggestions(
  associations: readonly Pick<AssociationRecord, 'relationType'>[],
): string[] {
  return [
    ...new Set(associations.map((association) => association.relationType.trim()).filter(Boolean)),
  ];
}
