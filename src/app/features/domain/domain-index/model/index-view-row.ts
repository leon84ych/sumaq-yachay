import { DomainLearnableRecord, DomainSheetRow } from "../../../catalog-detail/models/domain-sheet.model";

export interface IndexRow extends Record<string, unknown> , DomainSheetRow {
  id: string;
  chapter: string;
  theme: string;
  subtheme: string;
  syncStatus: 'pending' | 'synced';
}


export interface IndexDto extends Record<string, unknown> {
  id: string;
  chapter: string;
  theme: string;
  subtheme: string;
  tags: string;
  syncStatus: 'pending' | 'synced';
  contributor?: string;
}


export interface IndexTopicRecord extends DomainLearnableRecord
 {
  row: number;
  book?: string;
  author?: string;
  chapter: string;
  theme: string;
  subtheme: string;
  syncStatus: 'pending' | 'synced' | 'error';
}