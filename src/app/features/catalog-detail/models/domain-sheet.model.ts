export interface DomainSheet {
  row: number;                         // Owning Catalog entry row (local cache key, not sent to Sheets)
  id: string;                          // Tab name lowercased; second half of the [row+id] primary key
  name: string;                        // Raw tab name as returned by Apps Script (e.g. "Definitions")
  index: number;                       // Tab index as returned by Apps Script
  rows: Record<string, unknown>[];     // Row objects keyed by column header
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

// --- Known per-sheet row shapes (Phase D: Definitions & Quotes) ---


export interface DomainSheetRow extends Record<string, unknown> {
  id: string;
  tags?: string;
  syncStatus: 'synced' | 'pending' | 'error';
}

export interface ConceptRow extends DomainSheetRow{
  term: string;
  definition: string;
  category?: string;
  source?: string;

}

export interface QuoteRow {
  id: string;
  quote: string;
  book: string;
  analysis?: string;
  author: string;
  page?: string;
}



export interface IndexRow extends DomainSheetRow{
  chapter: string;
  theme: string;
  subtheme: string;
  tag: string;
}