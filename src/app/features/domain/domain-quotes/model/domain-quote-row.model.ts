import { DomainSheetRow } from "../../../catalog-detail/models/domain-sheet.model";

export interface QuoteRow extends DomainSheetRow {
  quote: string;
  analysis?: string;
  book: string;
  author: string;
  page?: string;
}

export interface QuoteRecord {
  id: string;
  row: number;
  book?: string;
  author: string;
  quote: string;
  analysis: string;
  page: string;
  tags: string[];
  syncStatus: 'pending' | 'synced' | 'error';
}