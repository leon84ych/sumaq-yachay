import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { PassageRaw, PassageRecord } from '../model/passages-model';
import { PassageGASRepository } from './passages-gas-repository';

const record: PassageRecord = {
  id: 'passage-1',
  bookId: 'book-1',
  bookRow: 7,
  itemRow: 15,
  title: 'A title',
  passageText: 'A long passage',
  book: 'A book',
  author: 'An author',
  page: '42',
  tags: ['#one', '#two'],
  syncStatus: 'pending',
  contributor: 'admin@example.com',
  feed: 5,
};

describe('PassageGASRepository', () => {
  const api = {
    getDomainPaginated: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  let repository: PassageGASRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: GASDomainAPI, useValue: api }],
    });
    repository = TestBed.inject(PassageGASRepository);
  });

  it('reads the PASSAGES sheet using the owning book row', async () => {
    const rows: PassageRaw[] = [];
    api.getDomainPaginated.mockResolvedValue({ data: { rows } });

    await repository.getDomain(7);

    expect(api.getDomainPaginated).toHaveBeenCalledWith(7, 'PASSAGES', 1, 50);
  });

  it('creates with bookRow as the row and an object-shaped raw row keeping id and bookId', async () => {
    api.addDomainItem.mockResolvedValue('gas-id');

    const created = await repository.addDomainItem(record);

    expect(api.addDomainItem).toHaveBeenCalledWith(7, 'book-1', 'PASSAGES', {
      id: 'passage-1',
      bookId: 'book-1',
      bookRow: 7,
      itemRow: 15,
      title: 'A title',
      passageText: 'A long passage',
      book: 'A book',
      author: 'An author',
      page: '42',
      tags: '#one|#two',
      syncStatus: 'pending',
      contributor: 'admin@example.com',
      feed: 5,
    });
    expect(created).toMatchObject({ id: 'gas-id', syncStatus: 'synced', tags: ['#one', '#two'] });
  });

  it('updates the existing item id with bookRow as the row', async () => {
    api.updateDomainItem.mockResolvedValue(undefined);

    const updated = await repository.updateDomainItem(record);

    expect(api.updateDomainItem).toHaveBeenCalledWith(
      7,
      'book-1',
      'PASSAGES',
      'passage-1',
      expect.objectContaining({
        id: 'passage-1',
        bookId: 'book-1',
        bookRow: 7,
        itemRow: 15,
        title: 'A title',
        passageText: 'A long passage',
        tags: '#one|#two',
        contributor: 'admin@example.com',
        feed: 5,
      }),
    );
    expect(updated.syncStatus).toBe('synced');
  });

  it('deletes using bookRow for the book and itemRow for the item', async () => {
    api.deleteDomainItem.mockResolvedValue(undefined);

    await repository.deleteDomainItem(record);

    expect(api.deleteDomainItem).toHaveBeenCalledWith(7, 'book-1', 'PASSAGES', 'passage-1', 15);
  });
});
