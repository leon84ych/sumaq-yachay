export type CatalogCategory = 'Technical' | 'Philosophy' | 'Fiction';

export type CatalogType =
  | 'entities'
  | 'relations'
  | 'excerpts'
  | 'timelines'
  | 'scenarios';

export type SyncState = 'synced' | 'pending' | 'error';

export interface CatalogItem {
  id: string;               // Unique UUID or SheetID
  sheetId: string;          // Google Sheet ID or URL
  name: string;             // Human-readable title
  category: CatalogCategory;// Technical | Philosophy | Fiction
  type: CatalogType;        // Entity schema type
  active: boolean;          // Active flag in Master Index
  description?: string;     // Optional context
  updatedAt: string;        // ISO-8601 timestamp
  syncStatus?: SyncState;   // Local sync tracking flag
}
