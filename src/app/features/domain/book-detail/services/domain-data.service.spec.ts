// @vitest-environment jsdom

import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../../../core/services/config/config.service';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { TagPickerService } from '../../../../shared/tag-picker/tag-picker.service';
import { BookGASRepository } from '../../../book/services/book-gas-repository';
import { IndexRepository } from '../../index/services/index-repository';
import { DomainDataService } from './domain-data.service';
import { GlobalMessageService } from '../../../../core/services/global-message.service';

describe('DomainDataService', () => {
  let sampleMode: boolean;
  let getBookInfo: ReturnType<typeof vi.fn>;
  let getIndex: ReturnType<typeof vi.fn>;
  let loadTags: ReturnType<typeof vi.fn>;
  let localSyncStatus: 'pending' | 'synced' | 'error';
  let showInfo: ReturnType<typeof vi.fn>;
  let showError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sampleMode = true;
    localSyncStatus = 'synced';
    showInfo = vi.fn();
    showError = vi.fn();
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
        { provide: TranslocoService, useValue: { translate: (key: string) => key } },
        { provide: GlobalMessageService, useValue: { showInfo, showError } },
        { provide: GASDomainAPI, useValue: {} },
        { provide: LocalDBService, useValue: { indexedDB: {
          books: { where: () => ({ equals: () => ({ first: async () => ({ id: 'book-1', row: 1, syncStatus: localSyncStatus }) }) }) },
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

  it('shows local domains immediately and refreshes remote metadata in the background', async () => {
    sampleMode = false;
    let resolveBookInfo!: (response: unknown) => void;
    getBookInfo.mockReturnValue(new Promise((resolve) => { resolveBookInfo = resolve; }));
    const service = TestBed.inject(DomainDataService);

    await service.loadForCatalog(1);

    expect(service.bookInfo()).toMatchObject({ id: 'book-1', syncStatus: 'synced' });
    expect(service.domainsInfo()).toEqual([{ id: 'INDEX', index: 0, count: 2 }]);
    expect(service.isLoading()).toBe(false);
    expect(getBookInfo).toHaveBeenCalledWith(1);
    expect(getIndex).not.toHaveBeenCalled();

    resolveBookInfo({
      status: 'success',
      data: { id: { id: 'book-1', row: 1 }, domains: [{ id: 'INDEX', index: 0, count: 3 }] },
    });
    await vi.waitFor(() => expect(getIndex).toHaveBeenCalledWith(1, 3));
  });

  it('shows session-expired info when a synced cached book cannot refresh', async () => {
    sampleMode = false;
    getBookInfo.mockRejectedValue(new Error('AUTHENTICATION_REQUIRED_READ'));

    await TestBed.inject(DomainDataService).loadForCatalog(1);

    await vi.waitFor(() => expect(showInfo).toHaveBeenCalledWith('BOOK_DETAIL.SESSION_EXPIRED'));
    expect(showError).not.toHaveBeenCalled();
  });

  it('shows an error when a pending cached book cannot refresh', async () => {
    sampleMode = false;
    localSyncStatus = 'pending';
    getBookInfo.mockRejectedValue(new Error('AUTHENTICATION_REQUIRED_READ'));

    await TestBed.inject(DomainDataService).loadForCatalog(1);

    await vi.waitFor(() => expect(showError).toHaveBeenCalledWith('AUTHENTICATION_REQUIRED_READ'));
    expect(showInfo).not.toHaveBeenCalled();
  });
});