export interface DomainSheet {
  catalogId: string;                    // Owning Catalog entry id (local key only, not sent to Sheets)
  name: string;                         // Raw tab name as returned by Apps Script (e.g. "Definitions")
  index: number;                        // Tab index as returned by Apps Script
  rows: Record<string, unknown>[];      // Row objects keyed by column header
}


export interface GetDomainSheetsResponse {
  status: 'success' | 'error';
  message?: string;
  data: {
    status: 'success' | 'error';
    catalogId: string;
    message?: string;
    sheets: Array<{
      index: number;
      name: string;
      rows: Record<string, unknown>[];
    }>;
  };
}

// --- Known per-sheet row shapes (Phase D: Definitions & Quotes) ---

export interface DefinitionRow {
  id: string;
  word: string;
  definition: string;
  synonims?: string;
}

export interface QuoteRow {
  id: string;
  quote: string;
  book: string;
  analysis?: string;
  author: string;
  page?: string;
}
