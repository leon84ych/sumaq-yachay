export interface DomainSheet {
  row: number; // Owning Catalog entry row (local cache key, not sent to Sheets)
  id: string; // Tab name lowercased; second half of the [row+id] primary key
  name: string; // Raw tab name as returned by Apps Script (e.g. "Definitions")
  index: number; // Tab index as returned by Apps Script
  rows: Record<string, unknown>[]; // Row objects keyed by column header
}

export interface GetDomainSheetsResponse {
  status: 'success' | 'error';
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
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  rows: Record<string, unknown>[];
}


export interface DomainSheetRow extends Record<string, unknown> {
  id: string; // Row ID within the sheet
  tags?: string; // Comma-separated list of tags associated with the row
  feed: number; // Feed priority 0 none, 1 low, 2 medium, 3 high, 4 very high, 5 highest associated with the row
  contributor: string; // User who contributed the row
  syncStatus: 'synced' | 'pending' | 'error';
}



