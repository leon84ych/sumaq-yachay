import { describe, expect, it } from 'vitest';
import { normalizeIndexRows } from '../model/index-view-row';

describe('normalizeIndexRows', () => {
  it('normalizes INDEX fields and tags to canonical values', () => {
    const rows = normalizeIndexRows([
      {
        id: 'idx_1',
        chapter: 1,
        theme: null,
        subtheme: undefined,
        tags: ['42'],
        syncStatus: 'pending',
      },
    ]);

    expect(rows).toEqual([
      {
        id: 'idx_1',
        chapter: '1',
        theme: '',
        subtheme: '',
        tags: ['#42'],
        syncStatus: 'pending',
      },
    ]);
  });

  it('returns canonical tag arrays', () => {
    const rows = normalizeIndexRows([
      { tags: ['#chapter'], chapter: '1' },
      { tags: ['#theme-a', '#theme-b'], chapter: '2' },
      { tags: ['#theme-c', '#theme-d'], chapter: '3' },
    ]);

    expect(rows.map((row) => row.tags)).toEqual([
      ['#chapter'],
      ['#theme-a', '#theme-b'],
      ['#theme-c', '#theme-d'],
    ]);
  });

  it('returns only the plural tags array', () => {
    const [row] = normalizeIndexRows([
      { id: 'idx_1', chapter: '1', theme: 'A', tags: ['#single', '#duplicate'] },
    ]);

    expect(row.tags).toEqual(['#single', '#duplicate']);
    expect(row).not.toHaveProperty('tag');
  });
});
