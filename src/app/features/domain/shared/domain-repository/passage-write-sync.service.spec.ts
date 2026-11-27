// @vitest-environment jsdom

import 'fake-indexeddb/auto';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../../../core/services/config/config.service';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { GlobalLoadingService } from '../../../../core/services/loading/global-loading.service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { IndexedDB, LocalDBService } from '../../../../shared/local-db/local-db.service';
import { GoogleAuthService } from '../../../authentication/services/google-auth-service';
import { BookQueryService } from '../../index/services/book-query.service';
import { PassageRecord } from '../../passages/model/passages-model';
import { PassagesComponent } from '../../passages/passages/passages.component';
import { PassageGASRepository } from '../../passages/services/passages-gas-repository';
import { PassageWriteSyncService } from './domain-write-sync.service';

describe('PassageWriteSyncService', () => {
  const databaseName = 'passage-write-sync-spec';
  let database: IndexedDB;
  let token: ReturnType<typeof signal<string | null>>;
  const gateway = {
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
    getDomain: vi.fn(),
  };
  const showError = vi.fn();
  const record: PassageRecord = {
    id: 'temporary', bookId: 'book', bookRow: 7, itemRow: 0, title: 'Title',
    passageText: 'Text', book: 'Book', author: 'Author', page: '', tags: [],
    contributor: '', feed: 5, syncStatus: 'pending', interval: 8,
  };

  beforeEach(() => {
    vi.resetAllMocks();
    database = new IndexedDB(databaseName);
    token = signal<string | null>('token');
    TestBed.configureTestingModule({
      providers: [
        { provide: LocalDBService, useValue: { indexedDB: database } },
        { provide: ConfigService, useValue: {
          localSampleDataEnabled: signal(false),
          isLocalSampleDataEnabled: () => false,
          getGasTimeoutMs: () => 60_000,
        } },
        { provide: GoogleAuthService, useValue: {
          idToken: token, currentUser: signal({ email: 'owner@example.com' }),
        } },
        { provide: PassageGASRepository, useValue: gateway },
        { provide: GlobalMessageService, useValue: { showError } },
        { provide: TranslocoService, useValue: { translate: (key: string) => key } },
      ],
    });
  });

  afterEach(async () => {
    TestBed.resetTestingModule();
    database.close();
    await Dexie.delete(databaseName);
  });

  it('saves before the server responds and persists the server ID and review state', async () => {
    let resolveCreate!: (value: PassageRecord) => void;
    gateway.addDomainItem.mockReturnValue(new Promise<PassageRecord>((resolve) => {
      resolveCreate = resolve;
    }));
    const service = TestBed.inject(PassageWriteSyncService);
    await service.save(record, false);
    expect(await database.passages.get(['book', 'temporary'])).toMatchObject({
      syncStatus: 'pending', interval: 8,
    });
    await vi.waitFor(() => expect(gateway.addDomainItem).toHaveBeenCalledOnce());
    await database.passages.update(['book', 'temporary'], { interval: 16 });
    resolveCreate({ ...record, interval: undefined, id: 'server-id', syncStatus: 'synced' });
    await vi.waitFor(async () => expect(await database.passages.get(['book', 'server-id']))
      .toMatchObject({ syncStatus: 'synced', interval: 16 }));
    expect(await database.passages.get(['book', 'temporary'])).toBeUndefined();
    expect(await database.pendingDomainWrites.count()).toBe(0);
  });

  it('preserves edits made while a create is being sent', async () => {
    let resolveCreate!: (value: PassageRecord) => void;
    gateway.addDomainItem.mockReturnValue(new Promise<PassageRecord>((resolve) => {
      resolveCreate = resolve;
    }));
    gateway.getDomain.mockResolvedValue([{ id: 'server-id', itemRow: 12 }]);
    gateway.updateDomainItem.mockImplementation(async (value: PassageRecord) => ({
      ...value, syncStatus: 'synced',
    }));
    const service = TestBed.inject(PassageWriteSyncService);
    await service.save(record, false);
    await vi.waitFor(() => expect(gateway.addDomainItem).toHaveBeenCalledOnce());
    await service.save({ ...record, title: 'Edited' }, true);
    resolveCreate({ ...record, id: 'server-id', syncStatus: 'synced' });
    await vi.waitFor(async () => expect(await database.passages.get(['book', 'server-id']))
      .toMatchObject({ title: 'Edited', itemRow: 12, syncStatus: 'synced' }));
  });

  it('preserves newer review state and server row when saving a stale edit', async () => {
    token.set(null);
    await database.passages.put({ ...record, id: 'server-id', itemRow: 12, interval: 32 });
    await database.metadata.put({
      key: 'passages-id-alias:["book","temporary"]', targetId: 'server-id',
    });
    const service = TestBed.inject(PassageWriteSyncService);

    await service.save({ ...record, title: 'Edited' }, true);

    expect(await database.passages.get(['book', 'server-id'])).toMatchObject({
      title: 'Edited', itemRow: 12, interval: 32,
    });
    expect(await database.pendingDomainWrites.get(['PASSAGES', 'book', 'server-id']))
      .toMatchObject({ operation: 'update', record: { itemRow: 12, interval: 32 } });
  });

  it('retains offline writes and sends them when the account reconnects', async () => {
    token.set(null);
    gateway.addDomainItem.mockResolvedValue({ ...record, id: 'server-id', syncStatus: 'synced' });
    const service = TestBed.inject(PassageWriteSyncService);
    await service.save(record, false);
    expect(await database.pendingDomainWrites.get(['PASSAGES', 'book', 'temporary']))
      .toMatchObject({ operation: 'create', state: 'queued' });
    expect(showError).toHaveBeenCalledWith('DOMAINS.PASSAGE.SYNC_OFFLINE');
    token.set('token');
    TestBed.tick();
    await vi.waitFor(async () => expect(await database.passages.get(['book', 'server-id']))
      .toMatchObject({ syncStatus: 'synced' }));
  });

  it('does not automatically retry an uncertain create', async () => {
    gateway.addDomainItem.mockRejectedValue(new Error('Connection lost'));
    const service = TestBed.inject(PassageWriteSyncService);
    await service.save(record, false);
    await vi.waitFor(async () => expect(await service.getWrite(record))
      .toMatchObject({ state: 'uncertain', lastError: 'Connection lost' }));
    expect(await database.passages.get(['book', 'temporary'])).toMatchObject({ syncStatus: 'pending' });
    expect(showError).toHaveBeenCalledWith('DOMAINS.PASSAGE.SYNC_UNCERTAIN');
    expect(gateway.addDomainItem).toHaveBeenCalledOnce();
  });

  it('closes the passage form and updates the visible status without a loading overlay', async () => {
    let resolveUpdate!: (value: PassageRecord) => void;
    gateway.updateDomainItem.mockReturnValue(new Promise<PassageRecord>((resolve) => {
      resolveUpdate = resolve;
    }));
    TestBed.overrideProvider(BookQueryService, { useValue: {
      getBookRecord: vi.fn().mockResolvedValue({ id: 'book', row: 7, name: 'Book', author: 'Author' }),
    } });
    TestBed.overrideProvider(PermissionService, { useValue: {
      role: signal('admin'), validatePermission: () => true,
    } });
    TestBed.overrideComponent(PassagesComponent, { set: { template: '', imports: [] } });
    const original = { ...record, id: 'existing', itemRow: 3, syncStatus: 'synced' as const };
    await database.passages.put(original);
    const fixture = TestBed.createComponent(PassagesComponent);
    fixture.componentRef.setInput('bookId', 'book');
    const component = fixture.componentInstance;
    await component.ngOnInit();
    component.editEntry(original);
    component.newTitle.set('Changed');
    await component.savePassage();
    expect(component.editingId()).toBeNull();
    expect(TestBed.inject(GlobalLoadingService).isLoading()).toBe(false);
    expect(await database.passages.get(['book', 'existing']))
      .toMatchObject({ title: 'Changed', syncStatus: 'pending' });
    await vi.waitFor(() => expect(gateway.updateDomainItem).toHaveBeenCalledOnce());
    resolveUpdate({ ...original, title: 'Changed', syncStatus: 'synced' });
    await vi.waitFor(() => expect(component.rows()).toContainEqual(
      expect.objectContaining({ id: 'existing', title: 'Changed', syncStatus: 'synced' }),
    ));
    fixture.destroy();
  });
});
