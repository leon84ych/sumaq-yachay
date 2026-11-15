import { SyncStatus } from "../../domain-1/shared/model/domain-shared-model";


export type SyncState = 'synced' | 'pending' | 'error';


/**
 * Specific model for catalog with GAS Google Sheets integration
 */

export interface CatalogRaw extends Record<string, unknown> {
  id: string;               // Unique ID
  subject: string;          // Entity schema subject
  topic: string;            // Entity schema topic
  name: string;             // Human-readable title
  author: string;           // Entity schema author
  description?: string;     // Optional context
  source?: string;          // Optional source URL
  active: boolean;          // Active flag in Master Index
  page: number;             // Current page number
  pages: number;            // Total number of pages
  updatedAt: string;        // ISO-8601 timestamp
  count: number;            // Count of related items
  syncStatus?: string;      // Local sync tracking flag
  row: number;              // Row number in Master Index (1-based, for display only)
}

/**
 * Tuple representing the values of a catalog row to be sent to GAS
 */
export type CatalogRawValues = [
  string,   //id
  string,   //subject
  string,   //topic
  string,   //name
  string,   //author     
  string,   //description
  string,   //source
  boolean,  //active
  number,   //page
  number,   //pages
  string,   //updatedAt
  number,   //count
  string,   //syncStatus
];



/**
 * Specific record model for catalog
 */
export interface CatalogRecord {
  id: string;               // Unique ID
  subject: string;          // Entity schema subject
  topic: string;            // Entity schema topic
  name: string;             // Human-readable title
  author: string;           // Entity schema author
  description?: string;     // Optional context
  source?: string;          // Optional source URL
  active: boolean;          // Active flag in Master Index
  page: number;             // Current page number
  pages: number;            // Total number of pages
  updatedAt: string;        // ISO-8601 timestamp
  count: number;            // Count of related items
  syncStatus?: SyncStatus;   // Local sync tracking flag
  row: number;              // Row number in Master Index (1-based, for display only)
}
