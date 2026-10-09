import { describe, expect, it } from 'vitest';
import { normalizeIndexRows } from './index-view-row';

describe('normalizeIndexRows', () => {
  it('normalizes every INDEX field to a string', () => {
    const rows = normalizeIndexRows([
      {
        id: 'idx_1',
        chapter: 1,
        theme: null,
        subtheme: undefined,
        tag: 42,
        syncStatus: 'pending',
      },
    ]);

    expect(rows).toEqual([
      {
        id: 'idx_1',
        chapter: '1',
        theme: '',
        subtheme: '',
        tag: '42',
        syncStatus: 'pending',
      },
    ]);
  });
});
