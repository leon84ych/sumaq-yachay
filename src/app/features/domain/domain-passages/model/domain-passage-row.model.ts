import { DomainSheetRow } from "../../../catalog-detail/models/domain-sheet.model";

export interface PassagesRow extends DomainSheetRow {
  title: string;
  passageText: string;
  book: string;
  author: string;
  page?: string;
}

export interface PassageRecord {
  id: string;
  row: number;
  book: string;
  author: string;
  title: string;
  passageText: string;
  page: string;
  tags: string[];
  syncStatus: 'pending' | 'synced' | 'error';
}