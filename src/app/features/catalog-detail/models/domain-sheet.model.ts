export interface DomainSheet {
  row: number; // Owning Catalog entry row (local cache key, not sent to Sheets)
  id: string; // Tab name lowercased; second half of the [row+id] primary key
  name: string; // Raw tab name as returned by Apps Script (e.g. "Definitions")
  index: number; // Tab index as returned by Apps Script
  rows: Record<string, unknown>[]; // Row objects keyed by column header
}

export interface GetDomainSheetsResponse {
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


export interface DomainSheetRow extends Record<string, unknown> {
  id: string; // Row ID within the sheet
  //tags: string; // Canonical hashtags serialized as a single string, e.g. '#tag1|#tag2'
  tags: string[]; // Canonical hashtags, e.g. ['#tag1', '#tag2']
  feed: number; // Feed priority 0 none, 1 low, 2 medium, 3 high, 4 very high, 5 highest associated with the row
  contributor: string; // User who contributed the row
  syncStatus: 'synced' | 'pending' | 'error';
}


/**
 * Represents a record within a domain sheet, including metadata for study tracking.
 */
export interface DomainLearnableRecord extends Record<string, unknown> {
  id: string; // Row ID within the sheet
  tags?: string[]; // Canonical hashtags, e.g. ['#tag1', '#tag2']
  repetitions: number; // Number of times the row has been reviewed successfuly 
  interval: number; // Interval in days until the next review
  easeFactor: number; // Complexity level associated with the row
  frequency: number; // Frequency level associated with the row
  lastReviewed: Date; // Last studied date associated with the row
  dueDate: Date; // Next review date associated with the row
}



