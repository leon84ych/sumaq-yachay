








export interface DomainSheet {
  row: number; // Owning Catalog entry row (local cache key, not sent to Sheets)
  id: string; // Tab name lowercased; second half of the [row+id] primary key
  name: string; // Raw tab name as returned by Apps Script (e.g. "Definitions")
  index: number; // Tab index as returned by Apps Script
  rows: Record<string, unknown>[]; // Row objects keyed by column header
}

