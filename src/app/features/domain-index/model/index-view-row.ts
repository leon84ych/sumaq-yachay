import { DomainSheetRow } from "../../catalog-detail/models/domain-sheet.model";
import { normalizeTags } from '../../../shared/utils/tag-utils';

export interface IndexViewRow extends Record<string, unknown> {
  id: string;
  chapter: string;
  theme: string;
  subtheme: string;
  tags: string[];
  syncStatus: 'pending' | 'synced';
}

export function normalizeIndexRows(rows: readonly Record<string, unknown>[]): IndexViewRow[] {
  return rows.map((row) => {
    const tags = normalizeTags(row['tags']);

    return {
      id: String(row['id'] ?? ''),
      chapter: String(row['chapter'] ?? ''),
      theme: String(row['theme'] ?? ''),
      subtheme: String(row['subtheme'] ?? ''),
      tags,
      syncStatus: row['syncStatus'] === 'synced' ? 'synced' : 'pending',
    };
  });
}


export interface IndexRow extends DomainSheetRow {
  chapter: string;
  theme: string;
  subtheme: string;
  tags: string[];
}

export interface IndexTopicRecord {
  id: string;
  row: number;
  book?: string;
  author?: string;
  tags: string[];
  chapter: string;
  theme: string;
  subtheme: string;
  syncStatus: 'pending' | 'synced' | 'error';
}