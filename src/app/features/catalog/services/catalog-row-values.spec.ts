import { describe, expect, it } from 'vitest';
import { CatalogItem } from '../models/catalog-item.model';
import { mapCatalogItemToRowValues } from './catalog-row-values';

describe('mapCatalogItemToRowValues', () => {
  it('maps a catalog item to the exact 11-column backend order', () => {
    const item: CatalogItem = {
      id: 'cat-1',
      subject: 'Technical',
      topic: 'Concurrency',
      name: 'Distributed Systems',
      author: 'Ada Lovelace',
      description: 'A description',
      source: 'https://example.com/source',
      active: true,
      updatedAt: '2026-10-08T19:00:00.000Z',
      count: 4,
      syncStatus: 'pending',
      row: 1,
    };

    expect(mapCatalogItemToRowValues(item)).toEqual([
      'cat-1',
      'Technical',
      'Concurrency',
      'Distributed Systems',
      'Ada Lovelace',
      'A description',
      'https://example.com/source',
      true,
      '2026-10-08T19:00:00.000Z',
      4,
      'pending',
    ]);
  });

  it('uses safe defaults for omitted optional values', () => {
    const item = {
      id: 'cat-2',
      subject: '',
      topic: '',
      name: '',
      author: '',
      description: '',
      source: '',
      active: true,
      updatedAt: '',
      count: 0,
      syncStatus: 'pending',
      row: 2,
    } as CatalogItem;

    const values = mapCatalogItemToRowValues(item);

    expect(values).toEqual([
      'cat-2',
      '',
      '',
      '',
      '',
      '',
      'PDF',
      true,
      expect.any(String),
      0,
      'pending',
    ]);
  });
});
