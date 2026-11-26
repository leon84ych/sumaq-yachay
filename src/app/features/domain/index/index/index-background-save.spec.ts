// @vitest-environment jsdom

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { ConfigService } from '../../../../core/services/config/config.service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { StudySearchService } from '../../../../core/services/search/study-search.service';
import { IndexedDB, LocalDBService } from '../../../../shared/local-db/local-db.service';
import { TagPickerService } from '../../../../shared/tag-picker/tag-picker.service';
import { GoogleAuthService } from '../../../authentication/services/google-auth-service';
import { DomainWriteSyncService } from '../../shared/domain-repository/domain-write-sync.service';
import { IndexRecord } from '../model/index-model';
import { IndexDataService } from '../services/index.service';
import { IndexGASRepository } from '../services/index-gas-repository';
import { IndexRepository } from '../services/index-repository';
import { IndexQueryService } from '../services/index-query.service';
import { BookQueryService } from '../services/book-query.service';
import { IndexComponent } from './index.component';

describe('Index background saves', () => {
  const record: IndexRecord = {
    id: 'existing', bookId: 'book', bookRow: 7, itemRow: 12, chapter: 'Chapter', theme: 'Theme',
    subtheme: '', tags: ['#tag'], contributor: 'reader@example.com', feed: 3, syncStatus: 'synced',
  };
  const saveLocally = vi.fn();
  const showError = vi.fn();
  const retryIndex = vi.fn();
  const getIndexWrite = vi.fn();
  const getActiveAccount = vi.fn();
  const deleteIndex = vi.fn();
  const confirmIndexDeletion = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    saveLocally.mockImplementation(async (value: IndexRecord) => value);
    getActiveAccount.mockReturnValue('owner@example.com');
    TestBed.configureTestingModule({ providers: [
      { provide: IndexDataService, useValue: { getBookRecord: vi.fn().mockResolvedValue({ row: 7 }), saveLocally } },
      { provide: DomainWriteSyncService, useValue: { resolveIndexId: (_book: string, id: string) => id, getIndexWrite, getActiveAccount, retryIndex, deleteIndex, confirmIndexDeletion } },
      { provide: GlobalMessageService, useValue: { showError } },
      { provide: PermissionService, useValue: { role: signal('admin') } },
      { provide: StudySearchService, useValue: { query: signal('') } },
      { provide: TranslocoService, useValue: { translate: (key: string) => key } },
    ] });
  });

  it('closes after local persistence without waiting for a remote request', async () => {
    const fixture = TestBed.createComponent(IndexComponent);
    fixture.componentRef.setInput('bookId', 'book');
    const component = fixture.componentInstance;
    const closed = vi.fn();
    component.closeEntry.subscribe(closed);
    component.newChapter.set('Chapter');
    component.newTheme.set('Theme');
    component.newTags.set(['#tag']);
    await component.addIndexEntry();
    expect(saveLocally).toHaveBeenCalledWith(expect.objectContaining({ syncStatus: 'pending', chapter: 'Chapter' }), false);
    expect(closed).toHaveBeenCalledOnce();
    expect(component.rows()).toHaveLength(1);
    expect(component.rows()[0].syncStatus).toBe('pending');
  });

  it('preserves row identity and contributor when editing', async () => {
    const fixture = TestBed.createComponent(IndexComponent);
    fixture.componentRef.setInput('bookId', 'book');
    const component = fixture.componentInstance;
    component.rows.set([record]);
    component.editEntry(record);
    component.newTheme.set('Edited');
    await component.addIndexEntry();
    expect(saveLocally).toHaveBeenCalledWith(expect.objectContaining({
      id: 'existing', itemRow: 12, contributor: 'reader@example.com', feed: 3, theme: 'Edited',
    }), true);
  });

  it('does not duplicate a row when local persistence resolves a temporary ID', async () => {
    saveLocally.mockImplementation(async (value: IndexRecord) => ({ ...value, id: 'server-id' }));
    const fixture = TestBed.createComponent(IndexComponent);
    fixture.componentRef.setInput('bookId', 'book');
    const component = fixture.componentInstance;
    component.rows.set([record, { ...record, id: 'server-id' }]);
    component.editEntry(record);
    component.newTheme.set('Edited');
    await component.addIndexEntry();
    expect(component.rows()).toHaveLength(1);
    expect(component.rows()[0]).toMatchObject({ id: 'server-id', theme: 'Edited' });
  });

  it('keeps the form open if the local database write fails', async () => {
    saveLocally.mockRejectedValue(new Error('Storage unavailable'));
    const fixture = TestBed.createComponent(IndexComponent);
    fixture.componentRef.setInput('bookId', 'book');
    const component = fixture.componentInstance;
    const closed = vi.fn();
    component.closeEntry.subscribe(closed);
    component.newChapter.set('Chapter');
    component.newTheme.set('Theme');
    component.newTags.set(['#tag']);
    await component.addIndexEntry();
    expect(closed).not.toHaveBeenCalled();
    expect(component.newTheme()).toBe('Theme');
    expect(showError).toHaveBeenCalledWith('Storage unavailable');
  });

  it('asks before manually retrying an uncertain create', async () => {
    const fixture = TestBed.createComponent(IndexComponent);
    fixture.componentRef.setInput('bookId', 'book');
    getIndexWrite.mockResolvedValue({ state: 'uncertain', operation: 'create', ownerEmail: 'owner@example.com' });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    await fixture.componentInstance.retryEntry(record);
    expect(retryIndex).not.toHaveBeenCalled();
    await fixture.componentInstance.retryEntry(record);
    expect(retryIndex).toHaveBeenCalledWith(record, false, true);
    confirm.mockRestore();
  });

  it('asks before assigning an unowned write to the signed-in account', async () => {
    const fixture = TestBed.createComponent(IndexComponent);
    fixture.componentRef.setInput('bookId', 'book');
    getIndexWrite.mockResolvedValue({ state: 'queued', operation: 'update' });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    await fixture.componentInstance.retryEntry(record);
    expect(retryIndex).not.toHaveBeenCalled();
    await fixture.componentInstance.retryEntry(record);
    expect(retryIndex).toHaveBeenCalledWith(record, true, false);
    confirm.mockRestore();
  });

  it('keeps a confirmed deletion visible and pending until synchronization', async () => {
    const fixture = TestBed.createComponent(IndexComponent);
    fixture.componentRef.setInput('bookId', 'book');
    const component = fixture.componentInstance;
    component.rows.set([record]);
    deleteIndex.mockResolvedValue('pending');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await component.deleteEntry(record.id);
    expect(deleteIndex).toHaveBeenCalledWith(record);
    expect(component.rows()).toEqual([expect.objectContaining({ id: record.id, syncStatus: 'pending' })]);
    expect(component.pendingDeletionIds().has(record.id)).toBe(true);
    confirm.mockRestore();
  });

  it('finishes an uncertain deletion only after the user confirms the server removed it', async () => {
    const fixture = TestBed.createComponent(IndexComponent);
    fixture.componentRef.setInput('bookId', 'book');
    const component = fixture.componentInstance;
    component.rows.set([record]);
    getIndexWrite.mockResolvedValue({ state: 'uncertain', operation: 'delete', ownerEmail: 'owner@example.com' });
    confirmIndexDeletion.mockResolvedValue(true);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await component.retryEntry(record);
    expect(confirmIndexDeletion).toHaveBeenCalledWith(record, false);
    expect(retryIndex).not.toHaveBeenCalled();
    expect(component.rows()).toEqual([]);
    confirm.mockRestore();
  });

  it('requires explicit verification before retrying an uncertain delete', async () => {
    const fixture = TestBed.createComponent(IndexComponent);
    fixture.componentRef.setInput('bookId', 'book');
    getIndexWrite.mockResolvedValue({ state: 'uncertain', operation: 'delete', ownerEmail: 'owner@example.com' });
    const confirm = vi.spyOn(window, 'confirm')
      .mockReturnValueOnce(false).mockReturnValueOnce(false)
      .mockReturnValueOnce(false).mockReturnValueOnce(true);
    await fixture.componentInstance.retryEntry(record);
    expect(retryIndex).not.toHaveBeenCalled();
    await fixture.componentInstance.retryEntry(record);
    expect(retryIndex).toHaveBeenCalledWith(record, false, true);
    confirm.mockRestore();
  });

  it('continues a real queued write after the Index view is destroyed', async () => {
    const databaseName = 'index-background-component-spec';
    const database = new IndexedDB(databaseName);
    let resolveCreate!: (value: IndexRecord) => void;
    const create = vi.fn().mockReturnValue(new Promise<IndexRecord>(resolve => { resolveCreate = resolve; }));
    TestBed.overrideProvider(IndexDataService, { useFactory: () => new IndexDataService(), deps: [] });
    TestBed.overrideProvider(DomainWriteSyncService, { useFactory: () => new DomainWriteSyncService(), deps: [] });
    TestBed.overrideProvider(LocalDBService, { useValue: { indexedDB: database } });
    TestBed.overrideProvider(ConfigService, { useValue: { localSampleDataEnabled: signal(false), isLocalSampleDataEnabled: () => false, getGasTimeoutMs: () => 60_000 } });
    TestBed.overrideProvider(GoogleAuthService, { useValue: { idToken: signal('token'), currentUser: signal({ email: 'reader@example.com' }) } });
    TestBed.overrideProvider(IndexGASRepository, { useValue: { addDomainItem: create } });
    TestBed.overrideProvider(IndexQueryService, { useValue: { getIndicesByBookRow: (bookId: string) => database.indexes.where('bookId').equals(bookId).toArray() } });
    TestBed.overrideProvider(IndexRepository, { useValue: { getDomain: vi.fn().mockResolvedValue([]) } });
    TestBed.overrideProvider(GlobalMessageService, { useValue: { showError, showInfo: vi.fn(), showSuccess: vi.fn() } });
    TestBed.overrideProvider(BookQueryService, { useValue: { getBookRecord: vi.fn().mockResolvedValue({ id: 'book', row: 7 }) } });
    TestBed.overrideProvider(TagPickerService, { useValue: { upsertBookTags: vi.fn().mockResolvedValue(undefined) } });
    TestBed.overrideComponent(IndexComponent, { set: { template: '', imports: [] } });
    try {
      const fixture = TestBed.createComponent(IndexComponent);
      fixture.componentRef.setInput('bookId', 'book');
      const component = fixture.componentInstance;
      const closed = vi.fn();
      component.closeEntry.subscribe(closed);
      component.newChapter.set('Chapter');
      component.newTheme.set('Background');
      component.newTags.set(['#tag']);
      await component.addIndexEntry();
      expect(closed).toHaveBeenCalledOnce();
      const pending = component.rows()[0];
      expect(await database.indexes.get(['book', pending.id])).toMatchObject({ syncStatus: 'pending' });
      await vi.waitFor(() => expect(create).toHaveBeenCalledOnce());
      fixture.destroy();
      resolveCreate({ ...pending, id: 'server-id', syncStatus: 'synced' });
      await vi.waitFor(async () => expect(await database.indexes.get(['book', 'server-id'])).toMatchObject({ syncStatus: 'synced' }));
      expect(await database.pendingDomainWrites.count()).toBe(0);
    } finally {
      TestBed.resetTestingModule();
      database.close();
      await Dexie.delete(databaseName);
    }
  });
});