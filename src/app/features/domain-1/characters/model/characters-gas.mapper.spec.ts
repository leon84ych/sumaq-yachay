import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CharacterGASMapper } from './characters-gas.mapper';
import { CharacterRaw, CharacterRecord } from './characters-model';

describe('CharacterGASMapper', () => {
  let mapper: CharacterGASMapper;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    mapper = TestBed.inject(CharacterGASMapper);
  });

  it('maps raw tags and sync status while keeping book and item rows distinct', () => {
    const raw: CharacterRaw = {
      id: 'character-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 17,
      name: 'A character',
      role: 'protagonist',
      nature: 'fictitious',
      tags: '#one|#two',
      feed: 3,
      contributor: 'reader@example.com',
      syncStatus: 'synced',
    };

    expect(mapper.toRecord(raw)).toMatchObject({
      id: 'character-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 17,
      tags: ['#one', '#two'],
      syncStatus: 'synced',
    });
  });

  it('serializes the complete record shape for GAS', () => {
    const record: CharacterRecord = {
      id: 'character-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 17,
      name: 'A character',
      role: 'protagonist',
      tags: ['#one', '#two'],
      feed: 3,
      contributor: 'reader@example.com',
      syncStatus: 'pending',
    };

    expect(mapper.toRaw(record)).toMatchObject({
      id: 'character-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 17,
      tags: '#one|#two',
      contributor: 'reader@example.com',
      syncStatus: 'pending',
    });
  });
});
