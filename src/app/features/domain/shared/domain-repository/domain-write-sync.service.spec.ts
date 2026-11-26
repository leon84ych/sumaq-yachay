// @vitest-environment jsdom

import 'fake-indexeddb/auto';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../../../core/services/config/config.service';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { IndexedDB, LocalDBService } from '../../../../shared/local-db/local-db.service';
import { GoogleAuthService } from '../../../authentication/services/google-auth-service';
import { IndexRecord } from '../../index/model/index-model';
import { IndexGASRepository } from '../../index/services/index-gas-repository';
import { DomainWriteSyncService } from './domain-write-sync.service';

describe('DomainWriteSyncService', () => {
  const databaseName = 'domain-write-sync-spec';
  let database: IndexedDB;
  let token: ReturnType<typeof signal<string | null>>;
  let sampleMode: ReturnType<typeof signal<boolean>>;
  let user: ReturnType<typeof signal<{ email: string } | null>>;
  let gateway: { addDomainItem: ReturnType<typeof vi.fn>; updateDomainItem: ReturnType<typeof vi.fn>; deleteDomainItem: ReturnType<typeof vi.fn>; getDomain: ReturnType<typeof vi.fn> };
  let showError: ReturnType<typeof vi.fn>;
  let timeoutMs: number;
  const record: IndexRecord = {
    id: 'temporary', bookId: 'book', bookRow: 7, itemRow: 0, chapter: 'Chapter', theme: 'Theme',
    subtheme: '', tags: ['#tag'], contributor: 'reader', feed: 0, syncStatus: 'pending',
  };

  function configure(): void {
    TestBed.configureTestingModule({ providers: [
      { provide: LocalDBService, useValue: { indexedDB: database } },
      { provide: ConfigService, useValue: { localSampleDataEnabled: sampleMode, isLocalSampleDataEnabled: () => sampleMode(), getGasTimeoutMs: () => timeoutMs } },
      { provide: GoogleAuthService, useValue: { idToken: token, currentUser: user } },
      { provide: IndexGASRepository, useValue: gateway },
      { provide: GlobalMessageService, useValue: { showError } },
      { provide: TranslocoService, useValue: { translate: (key: string) => key } },
    ] });
  }

  beforeEach(() => {
    database = new IndexedDB(databaseName);
    token = signal<string | null>(null);
    sampleMode = signal(false);
    user = signal<{ email: string } | null>({ email: 'owner@example.com' });
    gateway = { addDomainItem: vi.fn(), updateDomainItem: vi.fn(), deleteDomainItem: vi.fn(), getDomain: vi.fn() };
    gateway.getDomain.mockImplementation(async () => database.indexes.toArray());
    showError = vi.fn();
    timeoutMs = 60_000;
    configure();
  });

  afterEach(async () => {
    TestBed.resetTestingModule();
    database.close();
    await Dexie.delete(databaseName);
  });

  it('saves locally and automatically sends a queued create when authentication returns', async () => {
    gateway.addDomainItem.mockResolvedValue({ ...record, id: 'server-id', syncStatus: 'synced' });
    const service = TestBed.inject(DomainWriteSyncService);
    await service.saveIndex(record, false);
    expect(await database.indexes.get(['book', 'temporary'])).toMatchObject({ syncStatus: 'pending' });
    expect(await service.getIndexWrite(record)).toMatchObject({ operation: 'create', state: 'queued' });
    expect(showError).toHaveBeenCalledWith('DOMAINS.INDEX.SYNC_OFFLINE');
    expect(gateway.addDomainItem).not.toHaveBeenCalled();

    token.set('token');
    TestBed.tick();
    await vi.waitFor(async () => expect(await database.indexes.get(['book', 'server-id'])).toMatchObject({ syncStatus: 'synced' }));
    expect(await database.indexes.get(['book', 'temporary'])).toBeUndefined();
    expect(await database.pendingDomainWrites.count()).toBe(0);
  });

  it('requires an explicit retry after an uncertain create failure', async () => {
    token.set('token');
    gateway.addDomainItem.mockRejectedValueOnce(new Error('Connection lost'))
      .mockResolvedValueOnce({ ...record, id: 'server-id', syncStatus: 'synced' });
    const service = TestBed.inject(DomainWriteSyncService);
    await service.saveIndex(record, false);
    await vi.waitFor(async () => expect(await service.getIndexWrite(record)).toMatchObject({ state: 'uncertain', lastError: 'Connection lost' }));
    expect(await database.indexes.get(['book', 'temporary'])).toMatchObject({ syncStatus: 'pending' });
    expect(showError).toHaveBeenCalledWith('DOMAINS.INDEX.SYNC_UNCERTAIN');
    expect(gateway.addDomainItem).toHaveBeenCalledTimes(1);
    await service.retryIndex(record, false, true);
    await vi.waitFor(async () => expect(await database.indexes.get(['book', 'server-id'])).toBeDefined());
    expect(gateway.addDomainItem).toHaveBeenCalledTimes(2);
  });

  it('preserves edits made while a create is being sent', async () => {
    token.set('token');
    let resolveCreate!: (value: IndexRecord) => void;
    gateway.addDomainItem.mockReturnValue(new Promise<IndexRecord>(resolve => { resolveCreate = resolve; }));
    gateway.getDomain.mockResolvedValue([{ ...record, id: 'server-id', itemRow: 12 }]);
    gateway.updateDomainItem.mockImplementation(async (value: IndexRecord) => ({ ...value, syncStatus: 'synced' }));
    const service = TestBed.inject(DomainWriteSyncService);
    await service.saveIndex(record, false);
    await vi.waitFor(() => expect(gateway.addDomainItem).toHaveBeenCalledOnce());
    await service.saveIndex({ ...record, theme: 'Edited while sending' }, true);
    resolveCreate({ ...record, id: 'server-id', syncStatus: 'synced' });
    await vi.waitFor(async () => expect(await database.indexes.get(['book', 'server-id'])).toMatchObject({
      theme: 'Edited while sending', itemRow: 12, syncStatus: 'synced',
    }));
    expect(gateway.updateDomainItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'server-id', itemRow: 12, theme: 'Edited while sending' }), expect.any(AbortSignal));
    expect(await database.pendingDomainWrites.count()).toBe(0);
  });

  it('keeps sample changes local without creating queued requests', async () => {
    sampleMode.set(true);
    const service = TestBed.inject(DomainWriteSyncService);
    await service.saveIndex(record, false);
    expect(await database.indexes.get(['book', 'temporary'])).toMatchObject({ syncStatus: 'pending' });
    expect(await database.pendingDomainWrites.count()).toBe(0);
    expect(gateway.addDomainItem).not.toHaveBeenCalled();
  });

  it('keeps an offline deletion visible and queued', async () => {
    const saved = { ...record, id: 'existing', itemRow: 8, syncStatus: 'synced' as const };
    await database.indexes.put(saved);
    const service = TestBed.inject(DomainWriteSyncService);
    await expect(service.deleteIndex(saved)).resolves.toBe('pending');
    expect(await database.indexes.get(['book', 'existing'])).toMatchObject({ syncStatus: 'pending', theme: saved.theme });
    expect(await service.getIndexWrite(saved)).toMatchObject({ operation: 'delete', state: 'queued' });
    expect(showError).toHaveBeenCalledWith('DOMAINS.INDEX.DELETE_OFFLINE');
  });

  it('deletes sample entries locally without a remote queue', async () => {
    sampleMode.set(true);
    await database.indexes.put(record);
    const service = TestBed.inject(DomainWriteSyncService);
    await expect(service.deleteIndex(record)).resolves.toBe('deleted');
    expect(await database.indexes.get(['book', 'temporary'])).toBeUndefined();
    expect(await database.pendingDomainWrites.count()).toBe(0);
  });

  it('removes an unsent local create without sending a delete', async () => {
    const service = TestBed.inject(DomainWriteSyncService);
    await service.saveIndex(record, false);
    await expect(service.deleteIndex(record)).resolves.toBe('deleted');
    expect(await database.indexes.get(['book', 'temporary'])).toBeUndefined();
    expect(await database.pendingDomainWrites.count()).toBe(0);
    expect(gateway.addDomainItem).not.toHaveBeenCalled();
  });

  it('warns when discarding a create whose server result is unknown', async () => {
    const service = TestBed.inject(DomainWriteSyncService);
    await service.saveIndex(record, false);
    await database.pendingDomainWrites.update(['INDEX', 'book', 'temporary'], { state: 'uncertain', createMayExist: true });
    await expect(service.deleteIndex(record)).resolves.toBe('deleted');
    expect(await database.indexes.get(['book', 'temporary'])).toBeUndefined();
    expect(showError).toHaveBeenCalledWith('DOMAINS.INDEX.DELETE_UNCERTAIN_CREATE');
  });

  it('warns when a previously uncertain create is deleted before its confirmed retry is sent', async () => {
    const service = TestBed.inject(DomainWriteSyncService);
    await service.saveIndex(record, false);
    await database.pendingDomainWrites.update(['INDEX', 'book', 'temporary'], { state: 'queued', createMayExist: true });
    await expect(service.deleteIndex(record)).resolves.toBe('deleted');
    expect(await database.pendingDomainWrites.count()).toBe(0);
    expect(showError).toHaveBeenCalledWith('DOMAINS.INDEX.DELETE_UNCERTAIN_CREATE');
  });

  it('synchronizes create, update, and delete through a mocked gateway', async () => {
    token.set('token');
    const serverRecord = { ...record, id: 'server-id', itemRow: 12, syncStatus: 'synced' as const };
    gateway.addDomainItem.mockResolvedValue(serverRecord);
    gateway.updateDomainItem.mockImplementation(async (value: IndexRecord) => ({ ...value, syncStatus: 'synced' }));
    gateway.getDomain.mockResolvedValue([serverRecord]);
    gateway.deleteDomainItem.mockResolvedValue(undefined);
    const service = TestBed.inject(DomainWriteSyncService);
    await service.saveIndex(record, false);
    await vi.waitFor(async () => expect(await database.indexes.get(['book', 'server-id'])).toMatchObject({ syncStatus: 'synced' }));
    await service.saveIndex({ ...serverRecord, theme: 'Updated' }, true);
    await vi.waitFor(async () => expect(await database.indexes.get(['book', 'server-id'])).toMatchObject({ theme: 'Updated', syncStatus: 'synced' }));
    await service.deleteIndex({ ...serverRecord, theme: 'Updated' });
    await vi.waitFor(async () => expect(await database.indexes.get(['book', 'server-id'])).toBeUndefined());
    expect(gateway.addDomainItem).toHaveBeenCalledOnce();
    expect(gateway.updateDomainItem).toHaveBeenCalledOnce();
    expect(gateway.deleteDomainItem).toHaveBeenCalledOnce();
    expect(await database.pendingDomainWrites.count()).toBe(0);
  });

  it('keeps a delete visible until a mocked server confirms it', async () => {
    const saved = { ...record, id: 'existing', itemRow: 8, syncStatus: 'synced' as const };
    await database.indexes.put(saved);
    const service = TestBed.inject(DomainWriteSyncService);
    await service.deleteIndex(saved);
    let resolveDelete!: () => void;
    gateway.deleteDomainItem.mockReturnValue(new Promise<void>(resolve => { resolveDelete = resolve; }));
    token.set('token');
    TestBed.tick();
    await vi.waitFor(() => expect(gateway.deleteDomainItem).toHaveBeenCalledOnce());
    expect(await database.indexes.get(['book', 'existing'])).toBeDefined();
    resolveDelete();
    await vi.waitFor(async () => expect(await database.indexes.get(['book', 'existing'])).toBeUndefined());
    expect(await database.pendingDomainWrites.count()).toBe(0);
  });

  it('resolves the latest server row before deleting an item', async () => {
    token.set('token');
    const saved = { ...record, id: 'existing', itemRow: 8, syncStatus: 'synced' as const };
    await database.indexes.put(saved);
    gateway.getDomain.mockResolvedValue([{ ...saved, itemRow: 12 }]);
    gateway.deleteDomainItem.mockResolvedValue(undefined);
    const service = TestBed.inject(DomainWriteSyncService);
    await service.deleteIndex(saved);
    await vi.waitFor(async () => expect(await database.indexes.get(['book', 'existing'])).toBeUndefined());
    expect(gateway.deleteDomainItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'existing', itemRow: 12 }), expect.any(AbortSignal));
  });

  it('requires review rather than deleting by a stale row when the server item is absent', async () => {
    token.set('token');
    const saved = { ...record, id: 'existing', itemRow: 8, syncStatus: 'synced' as const };
    await database.indexes.put(saved);
    gateway.getDomain.mockResolvedValue([]);
    const service = TestBed.inject(DomainWriteSyncService);
    await service.deleteIndex(saved);
    await vi.waitFor(async () => expect(await service.getIndexWrite(saved)).toMatchObject({ operation: 'delete', state: 'uncertain' }));
    expect(await database.indexes.get(['book', 'existing'])).toBeDefined();
    expect(gateway.deleteDomainItem).not.toHaveBeenCalled();
  });

  it('requires explicit verification before retrying an uncertain delete', async () => {
    token.set('token');
    const saved = { ...record, id: 'existing', itemRow: 8, syncStatus: 'synced' as const };
    await database.indexes.put(saved);
    gateway.deleteDomainItem.mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce(undefined);
    const service = TestBed.inject(DomainWriteSyncService);
    await service.deleteIndex(saved);
    await vi.waitFor(async () => expect(await service.getIndexWrite(saved)).toMatchObject({ operation: 'delete', state: 'uncertain' }));
    await service.retryIndex(saved);
    expect(gateway.deleteDomainItem).toHaveBeenCalledTimes(1);
    expect(await database.indexes.get(['book', 'existing'])).toBeDefined();
    await service.retryIndex(saved, false, true);
    await vi.waitFor(async () => expect(await database.indexes.get(['book', 'existing'])).toBeUndefined());
  });

  it('can finish an uncertain deletion after the user verifies the server copy is gone', async () => {
    token.set('token');
    const saved = { ...record, id: 'existing', itemRow: 8, syncStatus: 'synced' as const };
    await database.indexes.put(saved);
    gateway.deleteDomainItem.mockRejectedValue(new Error('Response lost'));
    const service = TestBed.inject(DomainWriteSyncService);
    await service.deleteIndex(saved);
    await vi.waitFor(async () => expect(await service.getIndexWrite(saved)).toMatchObject({ state: 'uncertain' }));
    expect(await service.confirmIndexDeletion(saved)).toBe(true);
    expect(await database.indexes.get(['book', 'existing'])).toBeUndefined();
    expect(await database.pendingDomainWrites.count()).toBe(0);
    expect(gateway.deleteDomainItem).toHaveBeenCalledOnce();
  });

  it('does not resolve an uncertain deletion while a different account is active', async () => {
    const saved = { ...record, id: 'existing', itemRow: 8 };
    await database.indexes.put(saved);
    await database.pendingDomainWrites.put({
      domain: 'INDEX', bookId: 'book', id: 'existing', operation: 'delete', state: 'uncertain',
      revision: 1, record: saved, ownerEmail: 'owner@example.com',
    });
    user.set({ email: 'other@example.com' });
    const service = TestBed.inject(DomainWriteSyncService);
    expect(await service.confirmIndexDeletion(saved)).toBe(false);
    expect(await database.indexes.get(['book', 'existing'])).toBeDefined();
    expect(showError).toHaveBeenCalledWith('DOMAINS.INDEX.SYNC_ACCOUNT');
  });

  it('waits for an in-flight create, then deletes the assigned server row', async () => {
    token.set('token');
    let resolveCreate!: (value: IndexRecord) => void;
    gateway.addDomainItem.mockReturnValue(new Promise<IndexRecord>(resolve => { resolveCreate = resolve; }));
    gateway.getDomain.mockResolvedValue([{ ...record, id: 'server-id', itemRow: 12 }]);
    gateway.deleteDomainItem.mockResolvedValue(undefined);
    const service = TestBed.inject(DomainWriteSyncService);
    await service.saveIndex(record, false);
    await vi.waitFor(() => expect(gateway.addDomainItem).toHaveBeenCalledOnce());
    await expect(service.deleteIndex(record)).resolves.toBe('pending');
    expect(await service.getIndexWrite(record)).toMatchObject({ state: 'sending', deleteAfterCreate: true });
    resolveCreate({ ...record, id: 'server-id', syncStatus: 'synced' });
    await vi.waitFor(async () => expect(await database.pendingDomainWrites.count()).toBe(0));
    expect(await database.indexes.get(['book', 'server-id'])).toBeUndefined();
    expect(gateway.deleteDomainItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'server-id', itemRow: 12 }), expect.any(AbortSignal));
  });

  it('discards locally and warns if an in-flight create has an uncertain outcome after deletion', async () => {
    token.set('token');
    let rejectCreate!: (error: Error) => void;
    gateway.addDomainItem.mockReturnValue(new Promise<IndexRecord>((_resolve, reject) => { rejectCreate = reject; }));
    const service = TestBed.inject(DomainWriteSyncService);
    await service.saveIndex(record, false);
    await vi.waitFor(() => expect(gateway.addDomainItem).toHaveBeenCalledOnce());
    await service.deleteIndex(record);
    rejectCreate(new Error('Response lost'));
    await vi.waitFor(async () => expect(await database.pendingDomainWrites.count()).toBe(0));
    expect(await database.indexes.get(['book', 'temporary'])).toBeUndefined();
    expect(showError).toHaveBeenCalledWith('DOMAINS.INDEX.DELETE_UNCERTAIN_CREATE');
    expect(gateway.deleteDomainItem).not.toHaveBeenCalled();
  });

  it('deletes after an in-flight update and does not restore the updated record', async () => {
    token.set('token');
    const saved = { ...record, id: 'existing', itemRow: 8, syncStatus: 'synced' as const };
    let resolveUpdate!: (value: IndexRecord) => void;
    gateway.updateDomainItem.mockReturnValue(new Promise<IndexRecord>(resolve => { resolveUpdate = resolve; }));
    gateway.deleteDomainItem.mockResolvedValue(undefined);
    const service = TestBed.inject(DomainWriteSyncService);
    await service.saveIndex(saved, true);
    await vi.waitFor(() => expect(gateway.updateDomainItem).toHaveBeenCalledOnce());
    await service.deleteIndex(saved);
    await expect(service.saveIndex(saved, true)).rejects.toThrow('DOMAINS.INDEX.DELETE_PENDING');
    resolveUpdate({ ...saved, syncStatus: 'synced' });
    await vi.waitFor(async () => expect(await database.indexes.get(['book', 'existing'])).toBeUndefined());
    expect(gateway.deleteDomainItem).toHaveBeenCalledOnce();
    expect(await database.pendingDomainWrites.count()).toBe(0);
  });

  it('resumes a queued deletion after restarting and signing in', async () => {
    const saved = { ...record, id: 'existing', itemRow: 8, syncStatus: 'synced' as const };
    await database.indexes.put(saved);
    const first = TestBed.inject(DomainWriteSyncService);
    await first.deleteIndex(saved);
    TestBed.resetTestingModule();
    database.close();
    database = new IndexedDB(databaseName);
    token.set('token');
    gateway.deleteDomainItem.mockResolvedValue(undefined);
    configure();
    TestBed.inject(DomainWriteSyncService);
    TestBed.tick();
    await vi.waitFor(async () => expect(await database.indexes.get(['book', 'existing'])).toBeUndefined());
    expect(gateway.deleteDomainItem).toHaveBeenCalledOnce();
  });

  it('marks an interrupted delete uncertain after restart instead of repeating it', async () => {
    const saved = { ...record, id: 'existing', itemRow: 8 };
    await database.indexes.put(saved);
    await database.pendingDomainWrites.put({
      domain: 'INDEX', bookId: 'book', id: 'existing', operation: 'delete', state: 'sending', revision: 1,
      record: saved, ownerEmail: 'owner@example.com',
    });
    token.set('token');
    const service = TestBed.inject(DomainWriteSyncService);
    TestBed.tick();
    await vi.waitFor(async () => expect(await service.getIndexWrite(saved)).toMatchObject({ state: 'uncertain' }));
    expect(await database.indexes.get(['book', 'existing'])).toBeDefined();
    expect(gateway.deleteDomainItem).not.toHaveBeenCalled();
  });

  it('resolves an old temporary ID when an edit is saved after the create completes', async () => {
    token.set('token');
    gateway.addDomainItem.mockResolvedValue({ ...record, id: 'server-id', syncStatus: 'synced' });
    gateway.getDomain.mockResolvedValue([{ ...record, id: 'server-id', itemRow: 12 }]);
    gateway.updateDomainItem.mockImplementation(async (value: IndexRecord) => ({ ...value, syncStatus: 'synced' }));
    const service = TestBed.inject(DomainWriteSyncService);
    await service.saveIndex(record, false);
    await vi.waitFor(async () => expect(await database.indexes.get(['book', 'server-id'])).toBeDefined());
    await service.saveIndex({ ...record, theme: 'Edited after create' }, true);
    await vi.waitFor(async () => expect(await database.indexes.get(['book', 'server-id'])).toMatchObject({
      theme: 'Edited after create', itemRow: 12, syncStatus: 'synced',
    }));
    expect(await database.indexes.get(['book', 'temporary'])).toBeUndefined();
    expect(gateway.updateDomainItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'server-id', itemRow: 12 }), expect.any(AbortSignal));
  });

  it('keeps failed updates pending and retries them automatically after connectivity returns', async () => {
    token.set('token');
    const updated = { ...record, id: 'existing', itemRow: 8, theme: 'Updated' };
    gateway.updateDomainItem.mockRejectedValueOnce(new Error('Network failed'))
      .mockResolvedValueOnce({ ...updated, syncStatus: 'synced' });
    const service = TestBed.inject(DomainWriteSyncService);
    TestBed.tick();
    await service.saveIndex(updated, true);
    await vi.waitFor(async () => expect(await service.getIndexWrite(updated)).toMatchObject({
      operation: 'update', state: 'queued', lastError: 'Network failed',
    }));
    expect(await database.indexes.get(['book', 'existing'])).toMatchObject({ syncStatus: 'pending', theme: 'Updated' });
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(async () => expect(await database.indexes.get(['book', 'existing'])).toMatchObject({ syncStatus: 'synced' }));
    expect(gateway.updateDomainItem).toHaveBeenCalledTimes(2);
  });

  it('does not automatically repeat an interrupted create after restarting', async () => {
    await database.indexes.put(record);
    await database.pendingDomainWrites.put({
      domain: 'INDEX', bookId: 'book', id: 'temporary', operation: 'create', state: 'sending', revision: 1, record,
    });
    token.set('token');
    const service = TestBed.inject(DomainWriteSyncService);
    TestBed.tick();
    await vi.waitFor(async () => expect(await service.getIndexWrite(record)).toMatchObject({ state: 'uncertain' }));
    expect(gateway.addDomainItem).not.toHaveBeenCalled();
    expect(showError).toHaveBeenCalledWith('DOMAINS.INDEX.SYNC_UNCERTAIN');
  });

  it('does not send a pending write using a different account', async () => {
    const service = TestBed.inject(DomainWriteSyncService);
    await service.saveIndex(record, false);
    expect(await service.getIndexWrite(record)).toMatchObject({ ownerEmail: 'owner@example.com' });
    user.set({ email: 'other@example.com' });
    token.set('other-token');
    TestBed.tick();
    await vi.waitFor(() => expect(showError).toHaveBeenCalledWith('DOMAINS.INDEX.SYNC_ACCOUNT'));
    expect(gateway.addDomainItem).not.toHaveBeenCalled();
    await expect(service.saveIndex({ ...record, theme: 'Wrong account' }, true)).rejects.toThrow('DOMAINS.INDEX.SYNC_ACCOUNT');
    expect(await database.indexes.get(['book', 'temporary'])).toMatchObject({ theme: 'Theme' });
    gateway.addDomainItem.mockResolvedValue({ ...record, id: 'server-id', syncStatus: 'synced' });
    user.set({ email: 'owner@example.com' });
    TestBed.tick();
    await vi.waitFor(async () => expect(await database.indexes.get(['book', 'server-id'])).toBeDefined());
  });

  it('resumes a queued create after restarting and signing in', async () => {
    const first = TestBed.inject(DomainWriteSyncService);
    await first.saveIndex(record, false);
    TestBed.resetTestingModule();
    database.close();
    database = new IndexedDB(databaseName);
    token.set('token');
    gateway.addDomainItem.mockResolvedValue({ ...record, id: 'server-id', syncStatus: 'synced' });
    configure();
    TestBed.inject(DomainWriteSyncService);
    TestBed.tick();
    await vi.waitFor(async () => expect(await database.indexes.get(['book', 'server-id'])).toMatchObject({ syncStatus: 'synced' }));
    expect(await database.pendingDomainWrites.count()).toBe(0);
  });

  it('automatically recovers an interrupted update under the fallback lease', async () => {
    const updated = { ...record, id: 'existing', itemRow: 8 };
    await database.indexes.put(updated);
    await database.pendingDomainWrites.put({
      domain: 'INDEX', bookId: 'book', id: 'existing', operation: 'update', state: 'sending', revision: 1, record: updated, ownerEmail: 'owner@example.com',
    });
    gateway.updateDomainItem.mockResolvedValue({ ...updated, syncStatus: 'synced' });
    token.set('token');
    TestBed.inject(DomainWriteSyncService);
    TestBed.tick();
    await vi.waitFor(async () => expect(await database.indexes.get(['book', 'existing'])).toMatchObject({ syncStatus: 'synced' }));
    expect(gateway.updateDomainItem).toHaveBeenCalledOnce();
  });

  it('does not let a second worker reclaim an active request', async () => {
    token.set('token');
    let resolveCreate!: (value: IndexRecord) => void;
    gateway.addDomainItem.mockReturnValue(new Promise<IndexRecord>(resolve => { resolveCreate = resolve; }));
    const first = TestBed.inject(DomainWriteSyncService);
    TestBed.runInInjectionContext(() => new DomainWriteSyncService());
    await first.saveIndex(record, false);
    TestBed.tick();
    await vi.waitFor(() => expect(gateway.addDomainItem).toHaveBeenCalledOnce());
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(async () => expect(await first.getIndexWrite(record)).toMatchObject({ state: 'sending' }));
    expect(gateway.addDomainItem).toHaveBeenCalledOnce();
    resolveCreate({ ...record, id: 'server-id', syncStatus: 'synced' });
    await vi.waitFor(async () => expect(await database.indexes.get(['book', 'server-id'])).toBeDefined());
  });

  it('requires account confirmation before sending an unowned pending write', async () => {
    user.set(null);
    const service = TestBed.inject(DomainWriteSyncService);
    await service.saveIndex(record, false);
    token.set('token');
    user.set({ email: 'owner@example.com' });
    TestBed.tick();
    await vi.waitFor(() => expect(showError).toHaveBeenCalledWith('DOMAINS.INDEX.SYNC_ACCOUNT_UNKNOWN'));
    expect(gateway.addDomainItem).not.toHaveBeenCalled();
    await service.retryIndex(record);
    expect(gateway.addDomainItem).not.toHaveBeenCalled();
    gateway.addDomainItem.mockResolvedValue({ ...record, id: 'server-id', syncStatus: 'synced' });
    await service.retryIndex(record, true);
    await vi.waitFor(async () => expect(await database.indexes.get(['book', 'server-id'])).toBeDefined());
  });

  it('marks a stalled create uncertain and aborts its request at the deadline', async () => {
    timeoutMs = 20;
    token.set('token');
    gateway.addDomainItem.mockReturnValue(new Promise(() => {}));
    const service = TestBed.inject(DomainWriteSyncService);
    await service.saveIndex(record, false);
    await vi.waitFor(async () => expect(await service.getIndexWrite(record)).toMatchObject({
      state: 'uncertain', lastError: 'Synchronization request timed out.',
    }));
    const signal = gateway.addDomainItem.mock.calls[0][1] as AbortSignal;
    expect(signal.aborted).toBe(true);
    expect(await database.indexes.get(['book', 'temporary'])).toMatchObject({ syncStatus: 'pending' });
  });
});