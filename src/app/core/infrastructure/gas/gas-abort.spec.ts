// @vitest-environment jsdom

import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IndexRecord } from '../../../features/domain/index/model/index-model';
import { IndexGASRepository } from '../../../features/domain/index/services/index-gas-repository';
import { PermissionService } from '../../services/permission/permission.service';
import { TOKEN_KEY } from './gas-constants.constants';

describe('abortable domain writes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.removeItem(TOKEN_KEY);
    TestBed.resetTestingModule();
  });

  it('passes the supplied signal through the repository to create, update, and delete fetches', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ status: 'success', data: { id: 'server-id' } }),
    });
    vi.stubGlobal('fetch', fetchSpy);
    localStorage.setItem(TOKEN_KEY, 'token');
    TestBed.configureTestingModule({ providers: [
      { provide: TranslocoService, useValue: { translate: (key: string) => key } },
      { provide: PermissionService, useValue: { setRole: vi.fn() } },
    ] });
    const repository = TestBed.inject(IndexGASRepository);
    const record: IndexRecord = {
      id: 'item', bookId: 'book', bookRow: 7, itemRow: 8, chapter: 'Chapter', theme: 'Theme',
      subtheme: '', tags: ['#tag'], contributor: 'reader', feed: 0, syncStatus: 'pending',
    };
    const controller = new AbortController();
    await repository.addDomainItem(record, controller.signal);
    await repository.updateDomainItem(record, controller.signal);
    await repository.deleteDomainItem(record, controller.signal);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    for (const call of fetchSpy.mock.calls) {
      expect(call[1].signal).toBe(controller.signal);
    }
    const create = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    const update = JSON.parse(fetchSpy.mock.calls[1][1].body as string);
    const deletion = JSON.parse(fetchSpy.mock.calls[2][1].body as string);
    expect(create).toMatchObject({ action: 'CREATE_ROW', row: 7, rows: [{ itemRow: 8 }] });
    expect(update).toMatchObject({ action: 'UPDATE_ROW', row: 7, rows: [{ itemId: 'item', itemRow: 8 }] });
    expect(deletion).toMatchObject({ action: 'DELETE_ROW', row: 7, itemId: 'item', itemRow: 8, bookId: 'book', sheetName: 'INDEX' });
  });

  it('rejects a delete without an explicit success response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    localStorage.setItem(TOKEN_KEY, 'token');
    TestBed.configureTestingModule({ providers: [
      { provide: TranslocoService, useValue: { translate: (key: string) => key } },
      { provide: PermissionService, useValue: { setRole: vi.fn() } },
    ] });
    const repository = TestBed.inject(IndexGASRepository);
    const record: IndexRecord = {
      id: 'item', bookId: 'book', bookRow: 7, itemRow: 8, chapter: 'Chapter', theme: 'Theme',
      subtheme: '', tags: [], contributor: '', feed: 0, syncStatus: 'pending',
    };
    await expect(repository.deleteDomainItem(record)).rejects.toThrow('BOOK_DETAIL.ERRORS.DELETE_ROW_FAILED');
  });
});