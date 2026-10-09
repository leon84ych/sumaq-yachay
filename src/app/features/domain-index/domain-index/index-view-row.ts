export interface IndexViewRow extends Record<string, unknown> {
  id: string;
  chapter: string;
  theme: string;
  subtheme: string;
  tag: string;
  syncStatus: 'pending' | 'synced';
}

export function normalizeIndexRows(rows: readonly Record<string, unknown>[]): IndexViewRow[] {
  return rows.map((row) => ({
    id: String(row['id'] ?? ''),
    chapter: String(row['chapter'] ?? ''),
    theme: String(row['theme'] ?? ''),
    subtheme: String(row['subtheme'] ?? ''),
    tag: String(row['tag'] ?? ''),
    syncStatus: row['syncStatus'] === 'synced' ? 'synced' : 'pending',
  }));
}
