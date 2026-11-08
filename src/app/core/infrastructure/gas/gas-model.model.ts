/**
 * This models are raw only, representing the structure of data as returned by the GAS backend.
 * Do not include any application-specific logic or transformations here.
 * Do not include any feature or domain-specific types or logic here.
 */


/**
 * Response wrapper to all request to the server
 */
export interface CatalogResponseRow<CatalogRow> extends Record<string, any> {
    status: string;
    message: string;
    email: string;
    role: string;
    data: PaginatedResponseRow<CatalogRow>;
}


export interface PaginatedResponseRow<CatalogRow> extends Record<string, any> {
  sheetName: string;
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  rows: CatalogRow[];
}


/**
 * Specific model for catalog with GAS Google Sheets integration
 */

export interface CatalogRow extends Record<string, unknown>{
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
