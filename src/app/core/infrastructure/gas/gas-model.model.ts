/**
 * This models are raw only, representing the structure of data as returned by the GAS backend.
 * Do not include any application-specific logic or transformations here.
 * Do not include any feature or domain-specific types or logic here.
 * Use Raw sufix as it is returned without processing from GAS
 */


/**
 * Response wrapper to all request to the server
 */
export interface GASResponseRaw<T> extends Record<string, any> {
  status: string;
  message: string;
  email: string;
  role: string;
  data: T;
}


export interface PaginatedResponseRaw<CatalogRow> extends Record<string, any> {
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
export type CatalogRowValues = [
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
 * Payload structure for creating or updating a catalog item in GAS
 */
export interface CatalogPostPayload {
  action: 'UPDATE_CATALOG_ITEM' | 'CREATE_CATALOG_ITEM';
  id: string;
  row: number;
  rowValues: CatalogRowValues;
}


/**
 * Payload structure for cloning a whole catalog from a public sheet in GAS
 */
export interface CloneCatalogPayload {
  action: 'CLONE_CATALOG';
  SheetId: string;
}

export interface CloneCatalogItemPayload {
  action: 'CLONE_CATALOG_ITEM';
  SheetId: string;
}
export interface DeleteCatalogItemPayload {
  action: 'DELETE_CATALOG_ITEM';
  row: number;
  id: string;
}


//-----------------------------------------------------------------

/**
 * Tabs of the Domain Data spreadsheet owned by a Catalog row
 */
export interface SheetNamesRaw {
  sheets: Array<{
    index: number;
    name: string;
    rows?: Record<string, unknown>[];
  }>;
}

export interface DomainSheetRaw {
  row: number; // Owning Catalog entry row (local cache key, not sent to Sheets)
  id: string; // Tab name lowercased; second half of the [row+id] primary key
  name: string; // Raw tab name as returned by Apps Script (e.g. "Definitions")
  index: number; // Tab index as returned by Apps Script
  rows: Record<string, unknown>[]; // Row objects keyed by column header
}

// export interface CatalogItemRaw {
//   status: 'success' | 'error';
//   email?: string;
//   role?: string;
//   message?: string;
//   data: {
//     status: 'success' | 'error';
//     message?: string;
//     sheets: Array<{
//       index: number;
//       name: string;
//       rows: Record<string, unknown>[];
//     }>;
//   };
// }

export interface PaginatedDomainResponseRaw {
  row: number;
  sheetName: string;
  role?: string;
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  rows: Record<string, unknown>[];
}