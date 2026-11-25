import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { PlaceRaw, PlaceRecord } from '../model/places-model';
import { PlaceGASRepository } from './places-gas-repository';

const place: PlaceRecord = {
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

describe('PlaceGASRepository', () => {
  const api = {
    getDomainPaginated: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  let repository: PlaceGASRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: GASDomainAPI, useValue: api }] });
    repository = TestBed.inject(PlaceGASRepository);
  });

  it('reads PLACES using the owning book row', async () => {
    const raw: PlaceRaw = { ...place, tags: '#setting' };
    api.getDomainPaginated.mockResolvedValue({ data: { rows: [raw] } });

    const result = await repository.getDomain(8, 1);

    expect(api.getDomainPaginated).toHaveBeenCalledWith(8, 'PLACES', 1, 50);
    expect(result[0]).toMatchObject({ bookRow: 8, itemRow: 21, tags: '#setting' });
  });

  it('creates from the full raw record and maps the generated ID', async () => {
    api.addDomainItem.mockResolvedValue('gas-place-id');

    const created = await repository.addDomainItem(place);

    expect(api.addDomainItem).toHaveBeenCalledWith(8, 'book-1', 'PLACES', {
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
    expect(created).toMatchObject({ id: 'gas-place-id', syncStatus: 'synced' });
  });

  it('updates with separate book and item row identity', async () => {
    api.updateDomainItem.mockResolvedValue(undefined);

    await repository.updateDomainItem(place);

    expect(api.updateDomainItem).toHaveBeenCalledWith(
      8,
      'book-1',
      'PLACES',
      'place-1',
      expect.objectContaining({
        bookRow: 8,
        itemRow: 21,
        id: 'place-1',
        tags: '#setting|#history',
      }),
    );
  });

  it('deletes with bookRow and itemRow as distinct identifiers', async () => {
    api.deleteDomainItem.mockResolvedValue(undefined);

    await repository.deleteDomainItem(place);

    expect(api.deleteDomainItem).toHaveBeenCalledWith(8, 'book-1', 'PLACES', 'place-1', 21);
  });
});
