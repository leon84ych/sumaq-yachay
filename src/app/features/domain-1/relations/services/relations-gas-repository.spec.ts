import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { RelationRaw, RelationRecord } from '../model/relations-model';
import { RelationGASRepository } from './relations-gas-repository';

const relation: RelationRecord = {
  id: 'relation-1',
  bookId: 'book-1',
  bookRow: 8,
  itemRow: 22,
  sourceCharacterId: 'character-a',
  targetCharacterId: 'character-b',
  relationType: 'parent of',
  directed: true,
  description: 'A parent-child relationship.',
  color: '#D4A373',
  book: 'Book One',
  author: 'Author One',
  page: '42',
  tags: ['#family', '#history'],
  feed: 5,
  contributor: 'reader@example.com',
  syncStatus: 'pending',
};

describe('RelationGASRepository', () => {
  const api = {
    getDomainPaginated: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  let repository: RelationGASRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: GASDomainAPI, useValue: api }] });
    repository = TestBed.inject(RelationGASRepository);
  });

  it('reads RELATIONS using the owning book row', async () => {
    const raw: RelationRaw = { ...relation, tags: '#family' };
    api.getDomainPaginated.mockResolvedValue({ data: { rows: [raw] } });

    const result = await repository.getDomain(8, 1);

    expect(api.getDomainPaginated).toHaveBeenCalledWith(8, 'RELATIONS', 1, 50);
    expect(result[0]).toMatchObject({ bookRow: 8, itemRow: 22, tags: '#family' });
  });

  it('creates from the full raw record and maps the generated ID', async () => {
    api.addDomainItem.mockResolvedValue('gas-relation-id');

    const created = await repository.addDomainItem(relation);

    expect(api.addDomainItem).toHaveBeenCalledWith(8, 'book-1', 'RELATIONS', {
      id: 'relation-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 22,
      sourceCharacterId: 'character-a',
      targetCharacterId: 'character-b',
      relationType: 'parent of',
      directed: true,
      description: 'A parent-child relationship.',
      color: '#D4A373',
      book: 'Book One',
      author: 'Author One',
      page: '42',
      tags: '#family|#history',
      feed: 5,
      contributor: 'reader@example.com',
      syncStatus: 'pending',
    });
    expect(created).toMatchObject({ id: 'gas-relation-id', syncStatus: 'synced' });
  });

  it('updates while retaining both row identifiers and the relation ID', async () => {
    api.updateDomainItem.mockResolvedValue(undefined);

    await repository.updateDomainItem(relation);

    expect(api.updateDomainItem).toHaveBeenCalledWith(
      8,
      'book-1',
      'RELATIONS',
      'relation-1',
      expect.objectContaining({ bookRow: 8, itemRow: 22, id: 'relation-1' }),
    );
  });

  it('deletes with bookRow and itemRow as distinct identifiers', async () => {
    api.deleteDomainItem.mockResolvedValue(undefined);

    await repository.deleteDomainItem(relation);

    expect(api.deleteDomainItem).toHaveBeenCalledWith(8, 'book-1', 'RELATIONS', 'relation-1', 22);
  });
});
