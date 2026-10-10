import { DomainSheetRow } from "../../catalog-detail/models/domain-sheet.model";

export interface IndexViewRow extends Record<string, unknown> {
  id: string;
  chapter: string;
  theme: string;
  subtheme: string;
  tag: string;
  syncStatus: 'pending' | 'synced';
}

export function normalizeIndexRows(rows: readonly Record<string, unknown>[]): IndexViewRow[] {
  return rows.map((row) => {
    const tag = row['tag'] ?? row['tags'] ?? row['Tag'] ?? row['Tags'];

    return {
      id: String(row['id'] ?? ''),
      chapter: String(row['chapter'] ?? ''),
      theme: String(row['theme'] ?? ''),
      subtheme: String(row['subtheme'] ?? ''),
      tag: String(tag ?? ''),
      syncStatus: row['syncStatus'] === 'synced' ? 'synced' : 'pending',
    };
  });
}


export interface IndexRow extends DomainSheetRow {
  chapter: string;
  theme: string;
  subtheme: string;
  tag: string;
}