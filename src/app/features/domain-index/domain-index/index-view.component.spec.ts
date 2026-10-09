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

  it('reads tags with singular or plural and lowercase or title-case headers', () => {
    const rows = normalizeIndexRows([
      { Tag: '#chapter', chapter: '1' },
      { tags: '#theme-a, #theme-b', chapter: '2' },
      { Tags: '#theme-c; #theme-d', chapter: '3' },
    ]);

    expect(rows.map((row) => row.tag)).toEqual([
      '#chapter',
      '#theme-a, #theme-b',
      '#theme-c; #theme-d',
    ]);
  });
});
