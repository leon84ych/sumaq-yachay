// @vitest-environment jsdom

import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../../../core/services/config/config.service';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { TagPickerService } from '../../../../shared/tag-picker/tag-picker.service';
import { BookGASRepository } from '../../../book/services/book-gas-repository';
import { IndexRepository } from '../../index/services/index-repository';
import { DomainDataService } from './domain-data.service';

describe('DomainDataService', () => {
  let sampleMode: boolean;
  let getBookInfo: ReturnType<typeof vi.fn>;
  let getIndex: ReturnType<typeof vi.fn>;
  let loadTags: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sampleMode = true;
    getBookInfo = vi.fn().mockResolvedValue({
      status: 'success',
      data: { id: { id: 'book-1', row: 1 }, domains: [{ id: 'INDEX', index: 0, count: 2 }] },
    });
    getIndex = vi.fn().mockResolvedValue([]);
    loadTags = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: ConfigService, useValue: { isLocalSampleDataEnabled: () => sampleMode } },
        { provide: BookGASRepository, useValue: { getBookInfo } },
        { provide: IndexRepository, useValue: { getDomain: getIndex } },
        { provide: TagPickerService, useValue: { loadBookTagsByRow: loadTags } },
        { provide: GASDomainAPI, useValue: {} },
        { provide: LocalDBService, useValue: { indexedDB: {
          books: { where: () => ({ equals: () => ({ first: async () => ({ id: 'book-1', row: 1 }) }) }) },
          table: (name: string) => ({ where: () => ({ equals: () => ({ count: async () => name === 'indexes' ? 2 : 0 }) }) }),
        } } },
      ],
    });
  });

  it('discovers sample domains from LocalDB without contacting GAS', async () => {
    const service = TestBed.inject(DomainDataService);
    await service.loadForCatalog(1);
    expect(service.bookInfo()?.id).toBe('book-1');
    expect(service.domainsInfo()).toEqual([{ id: 'INDEX', index: 0, count: 2 }]);
    expect(loadTags).toHaveBeenCalledWith(1);
    expect(getBookInfo).not.toHaveBeenCalled();
    expect(getIndex).not.toHaveBeenCalled();
  });

  it('continues to discover remote domains outside sample mode', async () => {
    sampleMode = false;
    const service = TestBed.inject(DomainDataService);
    await service.loadForCatalog(1);
    expect(getBookInfo).toHaveBeenCalledWith(1);
    expect(getIndex).toHaveBeenCalledWith(1, 2);
  });
});