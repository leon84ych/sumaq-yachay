/**
 * This models are raw only, representing the structure of data as returned by the GAS backend.
 * Do not include any application-specific logic or transformations here.
 * Do not include any feature or domain-specific types or logic here.
 * Use Raw sufix as it is returned without processing from GAS
 */

import { BookRaw } from "../../../features/book/models/book-item.model";


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


export interface GASPaginatedResponseRaw<T> extends Record<string, any> {
  sheetName: string;
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  rows: T[];
}


/**
 * Payload structure for creating or updating a book item in GAS
 */
export interface BookPostPayload {
  action: 'UPDATE_BOOK' | 'CREATE_BOOK';
  id: string;
  row: number;
  rows: Record<string, unknown>[];
}


/**
 * Payload structure for cloning a whole book from a public sheet in GAS
 */
export interface CloneBookPayload {
  action: 'CLONE_BOOK';
  SheetId: string;
}

export interface CloneBookItemPayload {
  action: 'CLONE_BOOK';
  SheetId: string;
}
export interface DeleteBookItemPayload {
  action: 'DELETE_BOOK';
  row: number;
  id: string;
}


//-----------------------------------------------------------------

/**
 * Tabs of the Domain Data spreadsheet owned by a Book row
 */
export interface SheetNamesRaw {
  sheets: Array<{
    index: number;
    name: string;
    rows?: Record<string, unknown>[];
  }>;
}

export interface DomainSheetRaw {
  row: number; // Owning Book entry row (local cache key, not sent to Sheets)
  id: string; // Tab name lowercased; second half of the [row+id] primary key
  name: string; // Raw tab name as returned by Apps Script (e.g. "Definitions")
  index: number; // Tab index as returned by Apps Script
  rows: Record<string, unknown>[]; // Row objects keyed by column header
}

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


//-------------------- DOMAIN SHEET RAW --------------------


export interface SheetInfoRaw {
  id: string; // Name of the sheet tab
  index: number; // Position within the document
  count: number; // Number of rows without header
}

export interface BookInfoRaw {
  id: BookRaw, 
  sheets: SheetInfoRaw[];
}


export interface CreateDomainResponseRaw {
  row: number;
  createdSheet: string;
  status: string;
}