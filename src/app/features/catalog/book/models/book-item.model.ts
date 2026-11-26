import { SyncStatus } from "../../../domain/shared/model/domain-shared-model";


export type SyncState = 'synced' | 'pending' | 'error';


/**
 * Specific model for book with GAS Google Sheets integration
 */

export interface BookRaw extends Record<string, unknown> {
  id: string;               // Unique ID
  isbn: string;              // ISBN of the book
  subject: string;          // Entity schema subject
  topic: string;            // Entity schema topic
  name: string;             // Human-readable title
  author: string;           // Entity schema author
  language: string;          // Language of the book
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
 * Tuple representing the values of a book row to be sent to GAS
 */
export type BookRawValues = [
  string,   //id
  string,   //isbn
  string,   //subject
  string,   //topic
  string,   //name
  string,   //author     
  string,   //language
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
 * Specific record model for book
 */
export interface BookRecord {
  id: string;               // Unique ID
  isbn: string;              // ISBN of the book
  subject: string;          // Entity schema subject
  topic: string;            // Entity schema topic
  name: string;             // Human-readable title
  author: string;           // Entity schema author
  language: string;          // Language of the book
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
