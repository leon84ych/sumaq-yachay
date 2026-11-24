import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { AssociationRaw, AssociationRecord } from '../model/associations-model';
import { AssociationGASRepository } from './associations-gas-repository';

const association: AssociationRecord = {
  id: 'association-1',
  bookId: 'book-1',
  bookRow: 8,
  itemRow: 24,
  sourceConceptId: 'concept-a',
  targetConceptId: 'concept-b',
  relationType: 'causes',
  directed: true,
  description: 'One concept gives rise to the other.',
  color: '#735D78',
  book: 'Book One',
  author: 'Author One',
  page: '18-20',
  tags: ['#causality', '#theory'],
  feed: 4,
  contributor: 'reader@example.com',
  syncStatus: 'pending',
};

describe('AssociationGASRepository', () => {
  const api = {
    getDomainPaginated: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  let repository: AssociationGASRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: GASDomainAPI, useValue: api }] });
    repository = TestBed.inject(AssociationGASRepository);
  });

  it('reads ASSOCIATIONS using the owning book row', async () => {
    const raw: AssociationRaw = { ...association, tags: '#causality' };
    api.getDomainPaginated.mockResolvedValue({ data: { rows: [raw] } });

    const result = await repository.getDomain(8, 1);

    expect(api.getDomainPaginated).toHaveBeenCalledWith(8, 'ASSOCIATIONS', 1, 50);
    expect(result[0]).toMatchObject({ bookRow: 8, itemRow: 24, tags: '#causality' });
  });

  it('creates from the full raw record and maps the generated ID', async () => {
    api.addDomainItem.mockResolvedValue('gas-association-id');

    const created = await repository.addDomainItem(association);

    expect(api.addDomainItem).toHaveBeenCalledWith(8, 'book-1', 'ASSOCIATIONS', {
      id: 'association-1',
      bookId: 'book-1',
      bookRow: 8,
      itemRow: 24,
      sourceConceptId: 'concept-a',
      targetConceptId: 'concept-b',
      relationType: 'causes',
      directed: true,
      description: 'One concept gives rise to the other.',
      color: '#735D78',
      book: 'Book One',
      author: 'Author One',
      page: '18-20',
      tags: '#causality|#theory',
      feed: 4,
      contributor: 'reader@example.com',
      syncStatus: 'pending',
    });
    expect(created).toMatchObject({ id: 'gas-association-id', syncStatus: 'synced' });
  });

  it('updates while retaining both row identifiers and the association ID', async () => {
    api.updateDomainItem.mockResolvedValue(undefined);

    await repository.updateDomainItem(association);

    expect(api.updateDomainItem).toHaveBeenCalledWith(
      8,
      'book-1',
      'ASSOCIATIONS',
      'association-1',
      expect.objectContaining({ bookRow: 8, itemRow: 24, id: 'association-1' }),
    );
  });

  it('deletes with bookRow and itemRow as distinct identifiers', async () => {
    api.deleteDomainItem.mockResolvedValue(undefined);

    await repository.deleteDomainItem(association);

    expect(api.deleteDomainItem).toHaveBeenCalledWith(
      8,
      'book-1',
      'ASSOCIATIONS',
      'association-1',
      24,
    );
  });
});
