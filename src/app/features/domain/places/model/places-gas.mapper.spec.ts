import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PlaceGASMapper } from './places-gas.mapper';
import { PlaceRaw, PlaceRecord } from './places-model';

describe('PlaceGASMapper', () => {
  let mapper: PlaceGASMapper;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    mapper = TestBed.inject(PlaceGASMapper);
  });

  it('maps tags and sync status while preserving distinct book and item rows', () => {
    const raw: PlaceRaw = {
      id: 'place-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 21,
      name: 'Dublin',
      type: 'city',
      nature: 'real',
      coordinates: '53.3498, -6.2603',
      color: '#26734d',
      description: 'A city.',
      source: 'Atlas',
      tags: '#setting|#history',
      feed: 3,
      contributor: 'reader@example.com',
      syncStatus: 'synced',
    };

    expect(mapper.toRecord(raw)).toMatchObject({
      id: 'place-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 21,
      coordinates: '53.3498, -6.2603',
      tags: ['#setting', '#history'],
      syncStatus: 'synced',
    });
  });

  it('serializes every business and transport field to GAS', () => {
    const record: PlaceRecord = {
      id: 'place-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 21,
      name: 'Dublin',
      type: 'city',
      nature: 'real',
      coordinates: '53.3498, -6.2603',
      color: '#26734d',
      description: 'A city.',
      source: 'Atlas',
      tags: ['#setting', '#history'],
      feed: 3,
      contributor: 'reader@example.com',
      syncStatus: 'pending',
    };

    expect(mapper.toRaw(record)).toEqual({
      id: 'place-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 21,
      name: 'Dublin',
      type: 'city',
      nature: 'real',
      coordinates: '53.3498, -6.2603',
      color: '#26734d',
      description: 'A city.',
      source: 'Atlas',
      tags: '#setting|#history',
      feed: 3,
      contributor: 'reader@example.com',
      syncStatus: 'pending',
    });
  });
});
