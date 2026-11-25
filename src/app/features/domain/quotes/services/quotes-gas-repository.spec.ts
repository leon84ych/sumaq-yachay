import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { QuoteRaw, QuoteRecord } from '../model/quotes-model';
import { QuoteGASRepository } from './quotes-gas-repository';

const record: QuoteRecord = {
  id: 'quote-1',
  bookId: 'book-1',
  bookRow: 7,
  itemRow: 15,
  quote: 'A quote',
  analysis: 'An analysis',
  book: 'A book',
  author: 'An author',
  page: '42',
  tags: ['#one', '#two'],
  syncStatus: 'pending',
  contributor: 'admin@example.com',
  feed: 5,
};

describe('QuoteGASRepository', () => {
  const api = {
    getDomainPaginated: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  let repository: QuoteGASRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: GASDomainAPI, useValue: api }],
    });
    repository = TestBed.inject(QuoteGASRepository);
  });

  it('reads the QUOTES sheet using the owning book row', async () => {
    const rows: QuoteRaw[] = [];
    api.getDomainPaginated.mockResolvedValue({ data: { rows } });

    await repository.getDomain(7);

    expect(api.getDomainPaginated).toHaveBeenCalledWith(7, 'QUOTES', 1, 50);
  });

  it('creates with bookRow as the row and an object-shaped raw row', async () => {
    api.addDomainItem.mockResolvedValue('gas-id');

    const created = await repository.addDomainItem(record);

    expect(api.addDomainItem).toHaveBeenCalledWith(7, 'book-1', 'QUOTES', {
      id: 'quote-1',
      bookId: 'book-1',
      bookRow: 7,
      itemRow: 15,
      quote: 'A quote',
      analysis: 'An analysis',
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
      'QUOTES',
      'quote-1',
      expect.objectContaining({ quote: 'A quote', tags: '#one|#two', itemRow: 15 }),
    );
    expect(updated.syncStatus).toBe('synced');
  });

  it('deletes using bookRow for the book and itemRow for the item', async () => {
    api.deleteDomainItem.mockResolvedValue(undefined);

    await repository.deleteDomainItem(record);

    expect(api.deleteDomainItem).toHaveBeenCalledWith(7, 'book-1', 'QUOTES', 'quote-1', 15);
  });
});
