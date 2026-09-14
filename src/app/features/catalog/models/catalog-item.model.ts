
export type SyncState = 'synced' | 'pending' | 'error';

export interface CatalogItem {
  id: string;               // Unique ID
  subject: string;          // Entity schema subject
  topic: string;            // Entity schema topic
  name: string;             // Human-readable title
  author: string;           // Entity schema author
  description?: string;     // Optional context
  source?: string;          // Optional source URL
  active: boolean;          // Active flag in Master Index
  updatedAt: string;        // ISO-8601 timestamp
  syncStatus?: SyncState;   // Local sync tracking flag
}
