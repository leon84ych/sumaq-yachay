import { SyncState } from '../../catalog/models/catalog-item.model';
import { DomainSheetRow } from '../../catalog-detail/models/domain-sheet.model';

export interface BookRelation extends DomainSheetRow {
  /** Stable unique identifier for the character relation. Used as the primary key for local storage, updates, deletion, and synchronization. */
  id: string;
  /** Display row number assigned locally by the application. It is not part of the semantic identity of the relation. */
  row: number;
  /** ID of the CHARACTER where the relation originates. The value must reference an existing character from the current book's CHARACTER domain. */
  sourceCharacterId: string;
  /** ID of the CHARACTER at the other end of the relation. The value must reference an existing character from the current book's CHARACTER domain. */
  targetCharacterId: string;
  /** User-defined relationship type, stored in the user's own language. */
  relationType: string;
  /** Indicates whether the relationship has semantic direction. For example, parent_of is directional while sibling_of and spouse_of are normally symmetrical. */
  directed: boolean;
  /** Human-readable explanation of the relationship and its importance within the book. Maximum recommended length: 1000 characters. */
  description: string;
  /** Hex color used to represent this relationship in cards, graph edges, badges, or other visual elements. Example: "#D4A373". */
  color: string;
  /** Human-readable title of the book containing this relationship. */
  book: string;
  /** Author of the book containing this relationship. */
  author: string;
  /** Page number, page range, chapter reference, or other textual location supporting the relationship. Stored as a string because editions may use different pagination. */
  page: string;
  /** Searchable and filterable labels describing themes or context associated with the relationship. Every tag should start with #. */
  tags: string[];
  /** Local synchronization state of the relationship. */
  syncStatus: SyncState;
}

export type BookRelationRecord = Omit<BookRelation, 'row'> & {
  row: number;
  displayRow: number;
  tags: string[];
};

export function getRelationTypeSuggestions(
  relations: readonly Pick<BookRelation, 'relationType'>[],
): string[] {
  return [...new Set(relations.map((relation) => relation.relationType.trim()).filter(Boolean))];
}
