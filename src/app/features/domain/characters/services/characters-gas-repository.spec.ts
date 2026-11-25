import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { CharacterRaw, CharacterRecord } from '../model/characters-model';
import { CharacterGASRepository } from './characters-gas-repository';

const character: CharacterRecord = {
  id: 'character-1',
  bookId: 'book-1',
  bookRow: 8,
  itemRow: 17,
  name: 'A character',
  role: 'protagonist',
  nature: 'fictitious',
  description: 'Description',
  archetype: 'Wanderer',
  color: '#3b82f6',
  source: 'A book',
  tags: ['#one', '#two'],
  feed: 3,
  contributor: 'reader@example.com',
  syncStatus: 'pending',
};

describe('CharacterGASRepository', () => {
  const api = {
    getDomainPaginated: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  let repository: CharacterGASRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: GASDomainAPI, useValue: api }] });
    repository = TestBed.inject(CharacterGASRepository);
  });

  it('reads the CHARACTER sheet using the owning book row', async () => {
    api.getDomainPaginated.mockResolvedValue({
      data: {
        rows: [
          {
            id: 'character-1',
            bookId: 'book-1',
            bookRow: 8,
            itemRow: 17,
            name: 'A character',
            role: 'protagonist',
            tags: '#one',
            feed: 3,
            contributor: '',
            syncStatus: 'synced',
          } satisfies CharacterRaw,
        ],
      },
    });

    const records = await repository.getDomain(8, 1);

    expect(api.getDomainPaginated).toHaveBeenCalledWith(8, 'CHARACTER', 1, 50);
    expect(records[0]).toMatchObject({ bookRow: 8, itemRow: 17, tags: '#one' });
  });

  it('creates from the full raw record and maps the generated id', async () => {
    api.addDomainItem.mockResolvedValue('gas-character-id');

    const created = await repository.addDomainItem(character);

    expect(api.addDomainItem).toHaveBeenCalledWith(8, 'book-1', 'CHARACTER', {
      id: 'character-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 17,
      name: 'A character',
      role: 'protagonist',
      nature: 'fictitious',
      description: 'Description',
      archetype: 'Wanderer',
      color: '#3b82f6',
      source: 'A book',
      tags: '#one|#two',
      feed: 3,
      contributor: 'reader@example.com',
      syncStatus: 'pending',
    });
    expect(created).toMatchObject({ id: 'gas-character-id', syncStatus: 'synced' });
  });

  it('updates with separate book and item row identity', async () => {
    api.updateDomainItem.mockResolvedValue(undefined);

    await repository.updateDomainItem(character);

    expect(api.updateDomainItem).toHaveBeenCalledWith(
      8,
      'book-1',
      'CHARACTER',
      'character-1',
      expect.objectContaining({ bookRow: 8, itemRow: 17, id: 'character-1' }),
    );
  });

  it('deletes using the owning book row and the item row separately', async () => {
    api.deleteDomainItem.mockResolvedValue(undefined);

    await repository.deleteDomainItem(character);

    expect(api.deleteDomainItem).toHaveBeenCalledWith(8, 'book-1', 'CHARACTER', 'character-1', 17);
  });
});
