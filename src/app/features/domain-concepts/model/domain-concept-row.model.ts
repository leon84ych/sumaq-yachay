import { DomainSheetRow } from "../../catalog-detail/models/domain-sheet.model";

export interface ConceptRow extends DomainSheetRow {
  term: string;
  definition: string;
  category?: string;
  source?: string;
}

export interface ConceptRecord {
  id: string;
  row: number;
  book?: string;
  author?: string;
  tags: string[];
  term: string;
  definition: string;
  category: string;
  source: string;
  syncStatus: 'pending' | 'synced' | 'error';
}