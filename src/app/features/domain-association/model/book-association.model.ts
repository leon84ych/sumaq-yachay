import { SyncState } from '../../catalog/models/catalog-item.model';
import { DomainSheetRow } from '../../catalog-detail/models/domain-sheet.model';

export interface BookAssociation extends DomainSheetRow {
  /** Stable unique identifier for the concept relation. Used as the primary key for local storage, updates, deletion, and synchronization. */
  id: string;
  /** Display row number assigned locally by the application. It is not part of the semantic identity of the relation. */
  row: number;
  /** ID of the CONCEPT where the relationship originates. The value must reference an existing concept from the current book's CONCEPTS domain. */
  sourceConceptId: string;
  /** ID of the CONCEPT at the other end of the relationship. The value must reference an existing concept from the current book's CONCEPTS domain. */
  targetConceptId: string;
  /** User-defined relationship type, stored in the user's own language. */
  relationType: string;
  /** Indicates whether the relationship has semantic direction. For example, causes and part_of are directional, while related_to and contrasts_with are normally symmetrical. */
  directed: boolean;
  /** Human-readable explanation describing why the concepts are connected and how that relationship contributes to understanding the book. Maximum recommended length: 1000 characters. */
  description: string;
  /** Hex color used to visualize the relationship in graphs, cards, badges, or other UI elements. Example: "#735D78". */
  color: string;
  /** Human-readable title of the book containing this conceptual relationship. */
  book: string;
  /** Author of the book containing this conceptual relationship. */
  author: string;
  /** Page number, page range, chapter reference, or other textual location supporting the relationship. May be empty when the relationship is thematic or applies across the work. */
  page: string;
  /** Searchable and filterable labels describing themes or context associated with the conceptual relationship. Every tag should start with #. */
  tags: string[];
  /** Local synchronization state of the relationship. */
  syncStatus: SyncState;
}

export type BookAssociationRecord = Omit<BookAssociation, 'row'> & {
  row: number;
  displayRow: number;
  tags: string[];
};

export function getAssociationTypeSuggestions(
  associations: readonly Pick<BookAssociation, 'relationType'>[],
): string[] {
  return [
    ...new Set(associations.map((association) => association.relationType.trim()).filter(Boolean)),
  ];
}
