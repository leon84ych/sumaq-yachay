import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { TagPickerService } from '../../../../shared/tag-picker/tag-picker.service';
import { BookQueryService } from './book-query.service';
import { IndexQueryService } from './index-query.service';
import { IndexRepository } from './index-repository';
import { IndexDataService } from './index.service';
import { IndexRecord } from '../model/index-model';
import { GoogleAuthService } from '../../../authentication/services/google-auth-service';

const localRecord: IndexRecord = {
  id: 'local-1',
  bookId: 'book-1',
  bookRow: 7,
  itemRow: 2,
  chapter: 'Local chapter',
  theme: 'Local theme',
  subtheme: '',
  tags: ['#local'],
  contributor: 'reader',
  feed: 0,
  syncStatus: 'synced',
};

describe('IndexDataService.getRecords', () => {
  const getLocal = vi.fn();
  const getBook = vi.fn();
  const getRemote = vi.fn();
  const showInfo = vi.fn();
  const showSuccess = vi.fn();
  const showError = vi.fn();
  let token: string | null;

  beforeEach(() => {
    vi.resetAllMocks();
    token = 'auth-token';
    getBook.mockResolvedValue({ id: 'book-1', row: 7 });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        IndexDataService,
        { provide: IndexQueryService, useValue: { getIndicesByBookRow: getLocal } },
        { provide: BookQueryService, useValue: { getBookRecord: getBook } },
        { provide: IndexRepository, useValue: { getDomain: getRemote } },
        { provide: TagPickerService, useValue: {} },
        { provide: GlobalMessageService, useValue: { showInfo, showSuccess, showError } },
        { provide: GoogleAuthService, useValue: { idToken: () => token } },
        { provide: TranslocoService, useValue: { translate: (key: string) => key } },
      ],
    });
  });

  it('returns cached rows immediately and applies changed remote rows when refresh finishes', async () => {
    let resolveRemote!: (records: IndexRecord[]) => void;
    getLocal.mockResolvedValue([localRecord]);
    getRemote.mockReturnValue(new Promise<IndexRecord[]>((resolve) => { resolveRemote = resolve; }));
    const onRemoteUpdate = vi.fn();
    const service = TestBed.inject(IndexDataService);

    const records = await service.getRecords('book-1', onRemoteUpdate);

    expect(records).toEqual([localRecord]);
    expect(showInfo).toHaveBeenCalledWith('DOMAINS.INDEX.REFRESHING');
    expect(getRemote).toHaveBeenCalledWith(7);
    expect(onRemoteUpdate).not.toHaveBeenCalled();

    const remoteRecord = { ...localRecord, theme: 'Remote theme' };
    resolveRemote([remoteRecord]);
    await vi.waitFor(() => expect(onRemoteUpdate).toHaveBeenCalledWith([remoteRecord]));
    expect(showSuccess).toHaveBeenCalledWith('DOMAINS.INDEX.UPDATED');
    expect(showError).not.toHaveBeenCalled();
  });

  it('waits for the server when there is no local data', async () => {
    const remoteRecords = [{ ...localRecord, syncStatus: 'synced' as const }];
    getLocal.mockResolvedValue([]);
    getRemote.mockResolvedValue(remoteRecords);

    await expect(TestBed.inject(IndexDataService).getRecords('book-1')).resolves.toEqual(remoteRecords);
    expect(showInfo).toHaveBeenCalledWith('DOMAINS.INDEX.REFRESHING');
    expect(showSuccess).toHaveBeenCalledWith('DOMAINS.INDEX.REFRESHED');
  });

  it('keeps cached rows and reports a background refresh error', async () => {
    getLocal.mockResolvedValue([localRecord]);
    getRemote.mockRejectedValue(new Error('Network unavailable'));

    await expect(TestBed.inject(IndexDataService).getRecords('book-1')).resolves.toEqual([localRecord]);
    await vi.waitFor(() => expect(showError).toHaveBeenCalledWith('Network unavailable'));
  });

  it('uses cached rows only when the user is not authenticated', async () => {
    token = null;
    getLocal.mockResolvedValue([localRecord]);

    await expect(TestBed.inject(IndexDataService).getRecords('book-1')).resolves.toEqual([localRecord]);

    expect(getRemote).not.toHaveBeenCalled();
    expect(showInfo).toHaveBeenCalledWith('DOMAINS.INDEX.LOCAL_ONLY');
    expect(showError).not.toHaveBeenCalled();
  });

  it('returns an empty local result without requesting GAS when signed out and uncached', async () => {
    token = null;
    getLocal.mockResolvedValue([]);

    await expect(TestBed.inject(IndexDataService).getRecords('book-1')).resolves.toEqual([]);

    expect(getRemote).not.toHaveBeenCalled();
    expect(showInfo).toHaveBeenCalledWith('DOMAINS.INDEX.LOCAL_ONLY');
    expect(showError).not.toHaveBeenCalled();
  });
});