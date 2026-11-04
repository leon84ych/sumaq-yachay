


export interface DomainSheet {
  row: number; // Owning Catalog entry row (local cache key, not sent to Sheets)
  id: string; // Tab name lowercased; second half of the [row+id] primary key
  name: string; // Raw tab name as returned by Apps Script (e.g. "Definitions")
  index: number; // Tab index as returned by Apps Script
  rows: Record<string, unknown>[]; // Row objects keyed by column header
}

export interface CatalogItemRow {
  status: 'success' | 'error';
  email?: string;
  role?: string;
  message?: string;
  data: {
    status: 'success' | 'error';
    message?: string;
    sheets: Array<{
      index: number;
      name: string;
      rows: Record<string, unknown>[];
    }>;
  };
}

export interface PaginatedDomainRowsResponse {
  row: number;
  sheetName: string;
  role?: string;
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  rows: Record<string, unknown>[];
}





