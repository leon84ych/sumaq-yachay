import { DOCUMENT } from '@angular/common';
import { DestroyRef, effect, inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { ConfigService } from '../../../../core/services/config/config.service';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { liveQuery } from 'dexie';
import { LocalDBService, PendingDomainWrite } from '../../../../shared/local-db/local-db.service';
import { GoogleAuthService } from '../../../authentication/services/google-auth-service';
import { IndexRecord } from '../../index/model/index-model';
import { IndexGASRepository } from '../../index/services/index-gas-repository';

const DOMAIN = 'INDEX';
const LOCK_NAME = 'sumaq-yachay-index-write-sync';
const LEASE_KEY = 'index-write-sync-lease';
const RETRY_DELAY = 30_000;

@Injectable({ providedIn: 'root' })
export class DomainWriteSyncService {
  private readonly database = inject(LocalDBService).indexedDB;
  private readonly config = inject(ConfigService);
  private readonly auth = inject(GoogleAuthService);
  private readonly gateway = inject(IndexGASRepository);
  private readonly messages = inject(GlobalMessageService);
  private readonly transloco = inject(TranslocoService);
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly destroyRef = inject(DestroyRef);
  private running = false;
  private rerunRequested = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private destroyed = false;
  private readonly replacedIds = new Map<string, string>();
  private readonly owner = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  constructor() {
    const online = () => void this.resume().catch(error => console.error('Failed to resume Index synchronization:', error));
    this.window?.addEventListener('online', online);
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.window?.removeEventListener('online', online);
      if (this.timer) clearTimeout(this.timer);
    });
    effect(() => {
      this.auth.idToken();
      this.auth.currentUser?.();
      this.config.localSampleDataEnabled();
      void this.resume().catch(error => console.error('Failed to resume Index synchronization:', error));
    });
  }

  async saveIndex(record: IndexRecord, isEdit: boolean): Promise<IndexRecord> {
    const sampleMode = this.config.isLocalSampleDataEnabled();
    const indexes = this.database.indexes;
    const queue = this.database.pendingDomainWrites;
    const metadata = this.database.metadata;
    const pending = await this.database.transaction('rw', [indexes, queue, metadata], async () => {
      const alias = await metadata.get(this.aliasKey(record.bookId, record.id));
      const pending: IndexRecord = { ...record, id: alias?.targetId ?? record.id, syncStatus: 'pending' };
      const key: [string, string, string] = [DOMAIN, pending.bookId, pending.id];
      const existing = await queue.get(key);
      if (existing?.operation === 'delete' || existing?.deleteAfterCreate) {
        throw new Error(this.transloco.translate('DOMAINS.INDEX.DELETE_PENDING'));
      }
      if (existing?.ownerEmail && this.currentEmail() && !this.matchesAccount(existing)) {
        throw new Error(this.transloco.translate('DOMAINS.INDEX.SYNC_ACCOUNT', {
          bookId: pending.bookId, chapter: pending.chapter, theme: pending.theme,
          id: pending.id, ownerEmail: existing.ownerEmail,
        }));
      }
      await indexes.put(pending);
      if (!sampleMode) {
        await queue.put({
          domain: DOMAIN,
          bookId: pending.bookId,
          id: pending.id,
          operation: existing?.operation ?? (isEdit ? 'update' : 'create'),
          state: existing?.state ?? 'queued',
          revision: (existing?.revision ?? 0) + 1,
          record: pending,
          ...(existing?.ownerEmail || this.currentEmail() ? { ownerEmail: existing?.ownerEmail ?? this.currentEmail() } : {}),
          ...(existing?.lastError ? { lastError: existing.lastError } : {}),
          ...(existing?.createMayExist ? { createMayExist: true } : {}),
          ...(existing?.needsItemRow || (isEdit && !pending.itemRow && existing?.operation !== 'create')
            ? { needsItemRow: true } : {}),
        });
      }
      return pending;
    });
    if (!sampleMode) {
      if (!this.canSend()) this.notify(pending, 'DOMAINS.INDEX.SYNC_OFFLINE');
      this.kick();
    }
    return pending;
  }

  async deleteIndex(record: IndexRecord): Promise<'pending' | 'deleted'> {
    const sampleMode = this.config.isLocalSampleDataEnabled();
    const indexes = this.database.indexes;
    const queue = this.database.pendingDomainWrites;
    const metadata = this.database.metadata;
    let discardedUncertainCreate = false;
    const result = await this.database.transaction('rw', [indexes, queue, metadata], async () => {
      const alias = await metadata.get(this.aliasKey(record.bookId, record.id));
      const id = alias?.targetId ?? record.id;
      const key: [string, string, string] = [DOMAIN, record.bookId, id];
      const current = await indexes.get([record.bookId, id]);
      if (!current) throw new Error('The Index entry is no longer available.');
      const existing = await queue.get(key);
      if (existing?.ownerEmail && this.currentEmail() && !this.matchesAccount(existing)) {
        throw new Error(this.transloco.translate('DOMAINS.INDEX.SYNC_ACCOUNT', {
          bookId: current.bookId, chapter: current.chapter, theme: current.theme,
          id: current.id, ownerEmail: existing.ownerEmail,
        }));
      }
      if (sampleMode) {
        if (existing) throw new Error(this.transloco.translate('DOMAINS.INDEX.DELETE_PENDING_MODE'));
        await indexes.delete([record.bookId, id]);
        return 'deleted' as const;
      }
      if (existing?.operation === 'delete' || existing?.deleteAfterCreate) return 'pending' as const;
      if (existing?.operation === 'create' && existing.state !== 'sending') {
        discardedUncertainCreate = existing.state === 'uncertain' || !!existing.createMayExist || !!existing.lastError;
        await indexes.delete([record.bookId, id]);
        await queue.delete(key);
        return 'deleted' as const;
      }
      const pending: IndexRecord = { ...current, syncStatus: 'pending' };
      await indexes.put(pending);
      await queue.put({
        domain: DOMAIN,
        bookId: pending.bookId,
        id: pending.id,
        operation: existing?.operation === 'create' ? 'create' : 'delete',
        state: existing?.state === 'sending' ? 'sending' : 'queued',
        revision: (existing?.revision ?? 0) + 1,
        record: pending,
        ...(existing?.operation === 'create' ? { deleteAfterCreate: true } : {}),
        ...(existing?.ownerEmail || this.currentEmail() ? { ownerEmail: existing?.ownerEmail ?? this.currentEmail() } : {}),
        ...(existing?.operation !== 'create' ? { needsItemRow: true } : {}),
        ...(existing?.lastError ? { lastError: existing.lastError } : {}),
      });
      return 'pending' as const;
    });
    if (discardedUncertainCreate) this.notify(record, 'DOMAINS.INDEX.DELETE_UNCERTAIN_CREATE');
    if (result === 'pending') {
      if (!this.canSend()) this.notify(record, 'DOMAINS.INDEX.DELETE_OFFLINE');
      this.kick();
    }
    return result;
  }

  async getIndexWrite(record: IndexRecord): Promise<PendingDomainWrite | undefined> {
    return this.database.pendingDomainWrites.get([DOMAIN, record.bookId, record.id]);
  }

  resolveIndexId(bookId: string, id: string): string {
    return this.replacedIds.get(JSON.stringify([bookId, id])) ?? id;
  }

  watchIndexWrites(bookId: string, update: (writes: PendingDomainWrite[]) => void) {
    return liveQuery(() => this.database.pendingDomainWrites.where('bookId').equals(bookId)
      .filter(write => write.domain === DOMAIN).toArray()).subscribe({
      next: update,
      error: error => console.error('Failed to watch pending Index changes:', error),
    });
  }

  async retryIndex(record: IndexRecord, confirmAccount = false, confirmUncertain = false): Promise<void> {
    const queue = this.database.pendingDomainWrites;
    const write = await this.getIndexWrite(record);
    if (write?.state === 'uncertain' && (write.operation === 'create' || write.operation === 'delete') && !confirmUncertain) {
      this.notify(record, write.operation === 'delete' ? 'DOMAINS.INDEX.DELETE_UNCERTAIN' : 'DOMAINS.INDEX.SYNC_UNCERTAIN');
      return;
    }
    if (write && !write.ownerEmail) {
      if (!this.currentEmail()) {
        this.notify(record, 'DOMAINS.INDEX.SYNC_OFFLINE');
        return;
      }
      if (!confirmAccount) {
        this.notify(record, 'DOMAINS.INDEX.SYNC_ACCOUNT_UNKNOWN');
        return;
      }
    }
    if (write?.ownerEmail && !this.matchesAccount(write)) {
      this.notify(record, 'DOMAINS.INDEX.SYNC_ACCOUNT', '', write.ownerEmail);
      return;
    }
    await this.database.transaction('rw', queue, async () => {
      const key: [string, string, string] = [DOMAIN, record.bookId, record.id];
      const existing = await queue.get(key);
      if (!existing || existing.state === 'sending') return;
      if (existing.ownerEmail && !this.matchesAccount(existing)) return;
      if (!existing.ownerEmail && (!confirmAccount || !this.currentEmail())) return;
      if (existing.state === 'uncertain' && (existing.operation === 'create' || existing.operation === 'delete') && !confirmUncertain) return;
      await queue.put({ ...existing, ownerEmail: existing.ownerEmail ?? this.currentEmail(), state: 'queued', retryAt: 0,
        ...(existing.operation === 'create' && existing.state === 'uncertain' ? { createMayExist: true } : {}) });
    });
    if (!this.canSend()) this.notify(record, 'DOMAINS.INDEX.SYNC_OFFLINE');
    this.kick();
  }

  async confirmIndexDeletion(record: IndexRecord, confirmAccount = false): Promise<boolean> {
    const queue = this.database.pendingDomainWrites;
    const indexes = this.database.indexes;
    const pending = await this.getIndexWrite(record);
    if (!pending) return false;
    if (!this.currentEmail()) {
      this.notify(record, 'DOMAINS.INDEX.SYNC_OFFLINE');
      return false;
    }
    if (pending.ownerEmail && !this.matchesAccount(pending)) {
      this.notify(record, 'DOMAINS.INDEX.SYNC_ACCOUNT', '', pending.ownerEmail);
      return false;
    }
    if (!pending.ownerEmail && !confirmAccount) {
      this.notify(record, 'DOMAINS.INDEX.SYNC_ACCOUNT_UNKNOWN');
      return false;
    }
    return this.database.transaction('rw', [queue, indexes], async () => {
      const key: [string, string, string] = [DOMAIN, record.bookId, record.id];
      const write = await queue.get(key);
      if (!write || write.operation !== 'delete' || write.state !== 'uncertain') return false;
      if (!this.currentEmail() || (write.ownerEmail ? !this.matchesAccount(write) : !confirmAccount)) return false;
      await indexes.delete([record.bookId, record.id]);
      await queue.delete(key);
      return true;
    });
  }

  private canSend(): boolean {
    return !this.destroyed && !this.config.isLocalSampleDataEnabled() &&
      !!this.auth.idToken() && this.window?.navigator.onLine !== false;
  }

  private async resume(): Promise<void> {
    if (!this.canSend()) return;
    const queue = this.database.pendingDomainWrites;
    await this.database.transaction('rw', queue, async () => {
      const writes = await queue.where('[domain+state]').equals([DOMAIN, 'queued']).toArray();
      for (const write of writes) {
        if (this.matchesAccount(write) && write.retryAt) {
          await queue.put({ ...write, retryAt: 0 });
        }
      }
    });
    this.kick();
  }

  private currentEmail(): string | undefined {
    return this.auth.currentUser?.()?.email?.trim().toLowerCase() || undefined;
  }

  getActiveAccount(): string | undefined {
    return this.currentEmail();
  }

  private matchesAccount(write: PendingDomainWrite): boolean {
    return !!write.ownerEmail && write.ownerEmail === this.currentEmail();
  }

  private kick(delay = 0): void {
    if (this.destroyed) return;
    if (this.running && delay === 0) {
      this.rerunRequested = true;
      return;
    }
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.run().catch(error => console.error('Index synchronization failed:', error));
    }, delay);
  }

  private async run(): Promise<void> {
    if (!this.canSend() || this.running) return;
    this.running = true;
    try {
      const locks = this.window?.navigator.locks;
      if (locks) {
        let acquired = false;
        await locks.request(LOCK_NAME, { ifAvailable: true }, async lock => {
          if (!lock) return;
          acquired = true;
          await this.drain(true);
        });
        if (!acquired) this.kick(RETRY_DELAY);
      } else {
        if (await this.acquireLease()) {
          try {
            await this.drain(true, true);
          } finally {
            await this.releaseLease();
          }
        } else {
          this.kick(RETRY_DELAY);
        }
      }
    } finally {
      this.running = false;
      if (this.rerunRequested) {
        this.rerunRequested = false;
        this.kick();
      }
    }
  }

  private async acquireLease(): Promise<boolean> {
    const metadata = this.database.metadata;
    return this.database.transaction('rw', metadata, async () => {
      const current = await metadata.get(LEASE_KEY);
      if (current?.leaseOwner !== this.owner && (current?.leaseExpiresAt ?? 0) > Date.now()) return false;
      await metadata.put({
        key: LEASE_KEY,
        leaseOwner: this.owner,
        leaseExpiresAt: Date.now() + this.config.getGasTimeoutMs() + RETRY_DELAY,
      });
      return true;
    });
  }

  private async releaseLease(): Promise<void> {
    const metadata = this.database.metadata;
    await this.database.transaction('rw', metadata, async () => {
      if ((await metadata.get(LEASE_KEY))?.leaseOwner === this.owner) await metadata.delete(LEASE_KEY);
    });
  }

  private async drain(exclusive: boolean, useLease = false): Promise<void> {
    const queue = this.database.pendingDomainWrites;
    const interrupted = await queue.where('[domain+state]').equals([DOMAIN, 'sending']).toArray();
    for (const write of interrupted) {
      let discarded = false;
      const recovered = await this.database.transaction('rw', [queue, this.database.indexes], async () => {
        const current = await queue.get([write.domain, write.bookId, write.id]);
        if (!current || current.state !== 'sending') return undefined;
        if (current.operation === 'create' && current.deleteAfterCreate) {
          await this.database.indexes.delete([current.bookId, current.id]);
          await queue.delete([current.domain, current.bookId, current.id]);
          discarded = true;
          return current;
        }
        const updated: PendingDomainWrite = {
          ...current,
          state: current.operation === 'create' || current.operation === 'delete' || !exclusive ? 'uncertain' : 'queued',
          ...(current.operation === 'create' ? { createMayExist: true } : {}),
        };
        await queue.put(updated);
        return updated;
      });
      if (discarded && recovered) {
        this.notify(recovered.record as IndexRecord, 'DOMAINS.INDEX.DELETE_UNCERTAIN_CREATE');
      } else if (recovered?.state === 'uncertain') {
        this.notify(recovered.record as IndexRecord,
          recovered.operation === 'delete' ? 'DOMAINS.INDEX.DELETE_UNCERTAIN' : 'DOMAINS.INDEX.SYNC_UNCERTAIN');
      }
    }

    while (this.canSend()) {
      if (useLease && !(await this.acquireLease())) return;
      const pending = await queue.where('[domain+state]').equals([DOMAIN, 'queued']).toArray();
      const eligible = pending.filter(write => this.matchesAccount(write));
      if (pending.length && !eligible.length) {
        this.notify(pending[0].record as IndexRecord,
          pending[0].ownerEmail ? 'DOMAINS.INDEX.SYNC_ACCOUNT' : 'DOMAINS.INDEX.SYNC_ACCOUNT_UNKNOWN',
          '', pending[0].ownerEmail);
        return;
      }
      const ready = eligible.find(write => (write.retryAt ?? 0) <= Date.now());
      if (!ready) {
        const nextRetry = Math.min(...eligible.map(write => write.retryAt ?? 0));
        if (Number.isFinite(nextRetry)) this.kick(Math.max(0, nextRetry - Date.now()));
        return;
      }
      const claimed = await this.claim(ready);
      if (claimed) await this.deliver(claimed);
    }
  }

  private async claim(write: PendingDomainWrite): Promise<PendingDomainWrite | undefined> {
    const queue = this.database.pendingDomainWrites;
    return this.database.transaction('rw', queue, async () => {
      const key: [string, string, string] = [write.domain, write.bookId, write.id];
      const current = await queue.get(key);
      if (!current || current.state !== 'queued' || (current.retryAt ?? 0) > Date.now()) return undefined;
      const claimed: PendingDomainWrite = { ...current, state: 'sending' };
      await queue.put(claimed);
      return claimed;
    });
  }

  private async deliver(write: PendingDomainWrite): Promise<void> {
    let record = write.record as IndexRecord;
    let requestStarted = false;
    let verificationRequired = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.getGasTimeoutMs());
    try {
      if (write.needsItemRow) {
        const rows = await this.withAbort(this.gateway.getDomain(record.bookRow), controller.signal);
        const remote = rows.find(row => row.id === record.id);
        if (!remote || !remote.itemRow) {
          verificationRequired = write.operation === 'delete';
          throw new Error('The saved item row could not be located.');
        }
        record = { ...record, itemRow: remote.itemRow };
      }
      if (!this.canSend()) throw new Error('Offline or not signed in.');
      if (!this.matchesAccount(write)) throw new Error('The active account changed.');
      requestStarted = true;
      const saved = write.operation === 'create'
        ? await this.withAbort(this.gateway.addDomainItem(record, controller.signal), controller.signal)
        : write.operation === 'delete'
          ? await this.withAbort(this.gateway.deleteDomainItem(record, controller.signal), controller.signal).then(() => record)
          : await this.withAbort(this.gateway.updateDomainItem(record, controller.signal), controller.signal);
      await this.complete(write, saved);
    } catch (error) {
      await this.fail(write, error, requestStarted || verificationRequired);
    } finally {
      clearTimeout(timeout);
    }
  }

  private withAbort<T>(request: Promise<T>, signal: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => {
        signal.removeEventListener('abort', onAbort);
        reject(new Error('Synchronization request timed out.'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
      request.then(
        value => { signal.removeEventListener('abort', onAbort); resolve(value); },
        error => { signal.removeEventListener('abort', onAbort); reject(error); },
      );
      if (signal.aborted) onAbort();
    });
  }

  private async complete(write: PendingDomainWrite, saved: IndexRecord): Promise<void> {
    const queue = this.database.pendingDomainWrites;
    const indexes = this.database.indexes;
    const metadata = this.database.metadata;
    await this.database.transaction('rw', [queue, indexes, metadata], async () => {
      const key: [string, string, string] = [DOMAIN, write.bookId, write.id];
      const current = await queue.get(key);
      if (!current) return;
      if (write.operation === 'delete') {
        if (current.operation === 'delete' && current.revision === write.revision) {
          await indexes.delete([write.bookId, write.id]);
          await queue.delete(key);
        }
        return;
      }
      const latest = current.record as IndexRecord;
      if (saved.id !== write.id) {
        await indexes.delete([write.bookId, write.id]);
        await queue.delete(key);
        await metadata.put({ key: this.aliasKey(write.bookId, write.id), targetId: saved.id });
      }
      if (current.operation === 'delete' || current.deleteAfterCreate) {
        const pending: IndexRecord = { ...latest, id: saved.id, itemRow: saved.itemRow || latest.itemRow, syncStatus: 'pending' };
        await indexes.put(pending);
        await queue.put({ ...current, id: saved.id, operation: 'delete', state: 'queued', record: pending,
          deleteAfterCreate: false, needsItemRow: true, retryAt: 0 });
      } else if (current.revision === write.revision) {
        await indexes.put(saved);
        await queue.delete([DOMAIN, saved.bookId, saved.id]);
      } else {
        const updated: IndexRecord = {
          ...latest, id: saved.id, itemRow: saved.itemRow || latest.itemRow, syncStatus: 'pending',
        };
        await indexes.put(updated);
        await queue.put({
          ...current,
          id: saved.id,
          operation: 'update',
          state: 'queued',
          record: updated,
          needsItemRow: write.operation === 'create' && !saved.itemRow,
          retryAt: 0,
        });
      }
    });
    if (saved.id !== write.id) {
      this.replacedIds.set(JSON.stringify([write.bookId, write.id]), saved.id);
    }
  }

  private aliasKey(bookId: string, id: string): string {
    return `index-id-alias:${JSON.stringify([bookId, id])}`;
  }

  private async fail(write: PendingDomainWrite, error: unknown, requestStarted: boolean): Promise<void> {
    const queue = this.database.pendingDomainWrites;
    const message = error instanceof Error ? error.message : 'Synchronization failed.';
    let discarded = false;
    let discardedMayExist = false;
    let deletionSupersedesUpdate = false;
    await this.database.transaction('rw', [queue, this.database.indexes], async () => {
      const key: [string, string, string] = [DOMAIN, write.bookId, write.id];
      const current = await queue.get(key);
      if (!current) return;
      if (write.operation === 'create' && current.deleteAfterCreate) {
        discardedMayExist = requestStarted || !!current.createMayExist || !!current.lastError;
        await this.database.indexes.delete([write.bookId, write.id]);
        await queue.delete(key);
        discarded = true;
        return;
      }
      deletionSupersedesUpdate = write.operation === 'update' && current.operation === 'delete';
      const uncertain = (write.operation === 'create' || write.operation === 'delete') && requestStarted;
      await queue.put({
        ...current,
        state: uncertain ? 'uncertain' : 'queued',
        ...(write.operation === 'create' && requestStarted ? { createMayExist: true } : {}),
        lastError: message,
        attempts: (current.attempts ?? 0) + 1,
        retryAt: deletionSupersedesUpdate ? 0 : Date.now() + RETRY_DELAY,
      });
    });
    if (discarded) {
      if (discardedMayExist) this.notify(write.record as IndexRecord, 'DOMAINS.INDEX.DELETE_UNCERTAIN_CREATE', message);
    } else if (!deletionSupersedesUpdate) {
      const key = write.operation === 'delete'
        ? requestStarted ? 'DOMAINS.INDEX.DELETE_UNCERTAIN' : 'DOMAINS.INDEX.DELETE_FAILED'
        : write.operation === 'create' && requestStarted ? 'DOMAINS.INDEX.SYNC_UNCERTAIN' : 'DOMAINS.INDEX.SYNC_FAILED';
      this.notify(write.record as IndexRecord, key, message);
    }
  }

  private notify(record: IndexRecord, key: string, reason = '', ownerEmail = ''): void {
    this.messages.showError(this.transloco.translate(key, {
      bookId: record.bookId, chapter: record.chapter, theme: record.theme, id: record.id, reason, ownerEmail,
    }));
  }
}