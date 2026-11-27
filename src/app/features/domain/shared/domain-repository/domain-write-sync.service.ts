import { DOCUMENT } from '@angular/common';
import { DestroyRef, effect, inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { ConfigService } from '../../../../core/services/config/config.service';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { liveQuery, Table } from 'dexie';
import { LocalDBService, PendingDomainWrite } from '../../../../shared/local-db/local-db.service';
import { GoogleAuthService } from '../../../authentication/services/google-auth-service';
import { IndexRecord } from '../../index/model/index-model';
import { IndexGASRepository } from '../../index/services/index-gas-repository';
import { PassageGASRepository } from '../../passages/services/passages-gas-repository';
import { PassageRecord } from '../../passages/model/passages-model';
import { Domain } from '../model/domain-shared-model';
import { DomainName } from '../../../catalog/book-detail/models/domain-sheet-config';

const RETRY_DELAY = 30_000;
const DOMAIN_TABLES: Record<DomainName, string> = {
  INDEX: 'indexes', PASSAGES: 'passages', CONCEPTS: 'concepts', QUOTES: 'quotes',
  CHARACTER: 'characters', PLACES: 'places', BOOK_EVENTS: 'bookEvents',
  RELATIONS: 'relations', ASSOCIATIONS: 'associations', GLOSARY: 'glossary',
  QUESTIONS: 'questions',
};
const WRITE_COMPLETED_EVENT = 'sumaq-domain-write-completed';

@Injectable()
export abstract class DomainWriteSyncWorker<T extends Domain> {
  protected abstract readonly domain: DomainName;
  protected abstract readonly table: Table<T, [string, string]>;
  protected abstract readonly gateway: {
    addDomainItem(record: T, signal?: AbortSignal): Promise<T>;
    updateDomainItem(record: T, signal?: AbortSignal): Promise<T>;
    deleteDomainItem(record: T, signal?: AbortSignal): Promise<void>;
    getDomain(row: number): Promise<{ id: string; itemRow: number }[]>;
  };
  private readonly database = inject(LocalDBService).indexedDB;
  private readonly config = inject(ConfigService);
  private readonly auth = inject(GoogleAuthService);
  private readonly messages = inject(GlobalMessageService);
  private readonly transloco = inject(TranslocoService);
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly destroyRef = inject(DestroyRef);
  private running = false;
  private rerunRequested = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private destroyed = false;
  private readonly replacedIds = new Map<string, string>();
  private readonly warnedDependencies = new Set<string>();
  private readonly owner = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  constructor() {
    const online = () => void this.resume().catch(error => console.error(`Failed to resume ${this.domain} synchronization:`, error));
    const dependencyChanged = () => this.kick();
    this.window?.addEventListener('online', online);
    this.window?.addEventListener(WRITE_COMPLETED_EVENT, dependencyChanged);
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.window?.removeEventListener('online', online);
      this.window?.removeEventListener(WRITE_COMPLETED_EVENT, dependencyChanged);
      if (this.timer) clearTimeout(this.timer);
    });
    effect(() => {
      this.auth.idToken();
      this.auth.currentUser?.();
      this.config.localSampleDataEnabled();
      void this.resume().catch(error => console.error(`Failed to resume ${this.domain} synchronization:`, error));
    });
  }

  async save(record: T, isEdit: boolean): Promise<T> {
    const sampleMode = this.config.isLocalSampleDataEnabled();
    const indexes = this.table;
    const queue = this.database.pendingDomainWrites;
    const metadata = this.database.metadata;
    const pending = await this.database.transaction('rw', [indexes, queue, metadata], async () => {
      const alias = await metadata.get(this.aliasKey(record.bookId, record.id));
      const id = alias?.targetId ?? record.id;
      const stored = isEdit ? await indexes.get([record.bookId, id]) : undefined;
      const pending: T = this.preserveFeedState({
        ...record, id, itemRow: record.itemRow || stored?.itemRow || 0, syncStatus: 'pending',
      }, stored);
      const key: [string, string, string] = [this.domain, pending.bookId, pending.id];
      const existing = await queue.get(key);
      if (existing?.operation === 'delete' || existing?.deleteAfterCreate) {
        throw new Error(this.transloco.translate(this.messageKey('DELETE_PENDING')));
      }
      if (existing?.ownerEmail && this.currentEmail() && !this.matchesAccount(existing)) {
        throw new Error(this.transloco.translate(this.messageKey('SYNC_ACCOUNT'), {
          bookId: pending.bookId, chapter: pending['chapter'], theme: pending['theme'], title: pending['title'],
          id: pending.id, ownerEmail: existing.ownerEmail,
        }));
      }
      await indexes.put(pending);
      if (!sampleMode) {
        await queue.put({
          domain: this.domain,
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
      if (!this.canSend()) this.notify(pending, 'SYNC_OFFLINE');
      this.kick();
    }
    return pending;
  }

  async delete(record: T): Promise<'pending' | 'deleted'> {
    const sampleMode = this.config.isLocalSampleDataEnabled();
    const indexes = this.table;
    const queue = this.database.pendingDomainWrites;
    const metadata = this.database.metadata;
    let discardedUncertainCreate = false;
    const result = await this.database.transaction('rw', [indexes, queue, metadata], async () => {
      const alias = await metadata.get(this.aliasKey(record.bookId, record.id));
      const id = alias?.targetId ?? record.id;
      const key: [string, string, string] = [this.domain, record.bookId, id];
      const current = await indexes.get([record.bookId, id]);
      if (!current) throw new Error(`The ${this.domain} entry is no longer available.`);
      const existing = await queue.get(key);
      if (existing?.ownerEmail && this.currentEmail() && !this.matchesAccount(existing)) {
        throw new Error(this.transloco.translate(this.messageKey('SYNC_ACCOUNT'), {
          bookId: current.bookId, chapter: current['chapter'], theme: current['theme'], title: current['title'],
          id: current.id, ownerEmail: existing.ownerEmail,
        }));
      }
      if (sampleMode) {
        if (existing) throw new Error(this.transloco.translate(this.messageKey('DELETE_PENDING_MODE')));
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
      const pending: T = { ...current, syncStatus: 'pending' };
      await indexes.put(pending);
      await queue.put({
        domain: this.domain,
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
    if (discardedUncertainCreate) this.notify(record, 'DELETE_UNCERTAIN_CREATE');
    if (result === 'pending') {
      if (!this.canSend()) this.notify(record, 'DELETE_OFFLINE');
      this.kick();
    }
    return result;
  }

  async getWrite(record: T): Promise<PendingDomainWrite | undefined> {
    return this.database.pendingDomainWrites.get([this.domain, record.bookId, record.id]);
  }

  resolveId(bookId: string, id: string): string {
    return this.replacedIds.get(JSON.stringify([bookId, id])) ?? id;
  }

  watchWrites(bookId: string, update: (writes: PendingDomainWrite[]) => void) {
    return liveQuery(() => this.database.pendingDomainWrites.where('bookId').equals(bookId)
      .filter(write => write.domain === this.domain).toArray()).subscribe({
      next: update,
      error: error => this.messages.showError(error instanceof Error ? error.message : `Failed to watch ${this.domain} changes.`),
    });
  }

  async retry(record: T, confirmAccount = false, confirmUncertain = false): Promise<void> {
    const queue = this.database.pendingDomainWrites;
    const write = await this.getWrite(record);
    if (write?.state === 'uncertain' && (write.operation === 'create' || write.operation === 'delete') && !confirmUncertain) {
      this.notify(record, write.operation === 'delete' ? 'DELETE_UNCERTAIN' : 'SYNC_UNCERTAIN');
      return;
    }
    if (write && !write.ownerEmail) {
      if (!this.currentEmail()) {
        this.notify(record, 'SYNC_OFFLINE');
        return;
      }
      if (!confirmAccount) {
        this.notify(record, 'SYNC_ACCOUNT_UNKNOWN');
        return;
      }
    }
    if (write?.ownerEmail && !this.matchesAccount(write)) {
      this.notify(record, 'SYNC_ACCOUNT', '', write.ownerEmail);
      return;
    }
    await this.database.transaction('rw', queue, async () => {
      const key: [string, string, string] = [this.domain, record.bookId, record.id];
      const existing = await queue.get(key);
      if (!existing || existing.state === 'sending') return;
      if (existing.ownerEmail && !this.matchesAccount(existing)) return;
      if (!existing.ownerEmail && (!confirmAccount || !this.currentEmail())) return;
      if (existing.state === 'uncertain' && (existing.operation === 'create' || existing.operation === 'delete') && !confirmUncertain) return;
      await queue.put({ ...existing, ownerEmail: existing.ownerEmail ?? this.currentEmail(), state: 'queued', retryAt: 0,
        ...(existing.operation === 'create' && existing.state === 'uncertain' ? { createMayExist: true } : {}) });
    });
    if (!this.canSend()) this.notify(record, 'SYNC_OFFLINE');
    this.kick();
  }

  async confirmDeletion(record: T, confirmAccount = false): Promise<boolean> {
    const queue = this.database.pendingDomainWrites;
    const indexes = this.table;
    const pending = await this.getWrite(record);
    if (!pending) return false;
    if (!this.currentEmail()) {
      this.notify(record, 'SYNC_OFFLINE');
      return false;
    }
    if (pending.ownerEmail && !this.matchesAccount(pending)) {
      this.notify(record, 'SYNC_ACCOUNT', '', pending.ownerEmail);
      return false;
    }
    if (!pending.ownerEmail && !confirmAccount) {
      this.notify(record, 'SYNC_ACCOUNT_UNKNOWN');
      return false;
    }
    return this.database.transaction('rw', [queue, indexes], async () => {
      const key: [string, string, string] = [this.domain, record.bookId, record.id];
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
      const writes = await queue.where('[domain+state]').equals([this.domain, 'queued']).toArray();
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
      void this.run().catch(error => console.error(`${this.domain} synchronization failed:`, error));
    }, delay);
  }

  private async run(): Promise<void> {
    if (!this.canSend() || this.running) return;
    this.running = true;
    try {
      const locks = this.window?.navigator.locks;
      if (locks) {
        let acquired = false;
        await locks.request(`sumaq-yachay-${this.domain.toLowerCase()}-write-sync`, { ifAvailable: true }, async lock => {
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

  private get leaseKey(): string {
    return `${this.domain.toLowerCase()}-write-sync-lease`;
  }

  private async acquireLease(): Promise<boolean> {
    const metadata = this.database.metadata;
    return this.database.transaction('rw', metadata, async () => {
      const current = await metadata.get(this.leaseKey);
      if (current?.leaseOwner !== this.owner && (current?.leaseExpiresAt ?? 0) > Date.now()) return false;
      await metadata.put({
        key: this.leaseKey,
        leaseOwner: this.owner,
        leaseExpiresAt: Date.now() + this.config.getGasTimeoutMs() + RETRY_DELAY,
      });
      return true;
    });
  }

  private async releaseLease(): Promise<void> {
    const metadata = this.database.metadata;
    await this.database.transaction('rw', metadata, async () => {
      if ((await metadata.get(this.leaseKey))?.leaseOwner === this.owner) await metadata.delete(this.leaseKey);
    });
  }

  private async drain(exclusive: boolean, useLease = false): Promise<void> {
    const queue = this.database.pendingDomainWrites;
    const interrupted = await queue.where('[domain+state]').equals([this.domain, 'sending']).toArray();
    for (const write of interrupted) {
      let discarded = false;
      const recovered = await this.database.transaction('rw', [queue, this.table], async () => {
        const current = await queue.get([write.domain, write.bookId, write.id]);
        if (!current || current.state !== 'sending') return undefined;
        if (current.operation === 'create' && current.deleteAfterCreate) {
          await this.table.delete([current.bookId, current.id]);
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
        this.notify(recovered.record as T, 'DELETE_UNCERTAIN_CREATE');
      } else if (recovered?.state === 'uncertain') {
        this.notify(recovered.record as T,
          recovered.operation === 'delete' ? 'DELETE_UNCERTAIN' : 'SYNC_UNCERTAIN');
      }
    }

    while (this.canSend()) {
      if (useLease && !(await this.acquireLease())) return;
      const pending = await queue.where('[domain+state]').equals([this.domain, 'queued']).toArray();
      const eligible = pending.filter(write => this.matchesAccount(write));
      if (pending.length && !eligible.length) {
        this.notify(pending[0].record as T,
          pending[0].ownerEmail ? 'SYNC_ACCOUNT' : 'SYNC_ACCOUNT_UNKNOWN',
          '', pending[0].ownerEmail);
        return;
      }
      const ready = eligible.filter(write => (write.retryAt ?? 0) <= Date.now());
      if (!ready.length) {
        const nextRetry = Math.min(...eligible.map(write => write.retryAt ?? 0));
        if (Number.isFinite(nextRetry)) this.kick(Math.max(0, nextRetry - Date.now()));
        return;
      }
      let claimed: PendingDomainWrite | undefined;
      for (const candidate of ready) {
        claimed = await this.claim(candidate);
        if (claimed) break;
      }
      if (!claimed) {
        this.kick(RETRY_DELAY);
        return;
      }
      await this.deliver(claimed);
    }
  }

  private async claim(write: PendingDomainWrite): Promise<PendingDomainWrite | undefined> {
    const queue = this.database.pendingDomainWrites;
    return this.database.transaction('rw', this.database.tables, async () => {
      const key: [string, string, string] = [write.domain, write.bookId, write.id];
      const current = await queue.get(key);
      if (!current || current.state !== 'queued' || (current.retryAt ?? 0) > Date.now()) return undefined;
      const resolved = current.operation === 'delete'
        ? current.record as T
        : await this.resolveReferences(current.record as T);
      if (!resolved) return undefined;
      const local = resolved !== current.record
        ? this.preserveFeedState(resolved, await this.table.get([current.bookId, current.id]))
        : resolved;
      const claimed: PendingDomainWrite = { ...current, record: local, state: 'sending' };
      if (resolved !== current.record) await this.table.put(local);
      await queue.put(claimed);
      return claimed;
    });
  }

  private async resolveReferences(record: T): Promise<T | undefined> {
    const references: { field: string; domain: DomainName; multiple?: boolean }[] = [];
    if (this.domain === 'RELATIONS') {
      references.push({ field: 'sourceCharacterId', domain: 'CHARACTER' }, { field: 'targetCharacterId', domain: 'CHARACTER' });
    } else if (this.domain === 'ASSOCIATIONS') {
      references.push({ field: 'sourceConceptId', domain: 'CONCEPTS' }, { field: 'targetConceptId', domain: 'CONCEPTS' });
    } else if (this.domain === 'BOOK_EVENTS') {
      references.push({ field: 'mainCharacterId', domain: 'CHARACTER' }, { field: 'secondaryCharacterIds', domain: 'CHARACTER', multiple: true }, { field: 'placeId', domain: 'PLACES' });
    } else if (this.domain === 'QUESTIONS' && typeof record['sourceDomain'] === 'string' &&
      Object.hasOwn(DOMAIN_TABLES, record['sourceDomain'])) {
      references.push({ field: 'sourceRowId', domain: record['sourceDomain'] as DomainName });
    }

    let updated = record;
    for (const reference of references) {
      const value = record[reference.field];
      const ids = reference.multiple ? (Array.isArray(value) ? value : []) : [value];
      const resolvedIds: string[] = [];
      for (const id of ids) {
        if (typeof id !== 'string' || !id) continue;
        const alias = await this.database.metadata.get(`${reference.domain.toLowerCase()}-id-alias:${JSON.stringify([record.bookId, id])}`);
        const targetId = alias?.targetId ?? id;
        const pending = await this.database.pendingDomainWrites.get([reference.domain, record.bookId, targetId]);
        if (pending) return undefined;
        const existing = await this.database.table<Domain, [string, string]>(DOMAIN_TABLES[reference.domain]).get([record.bookId, targetId]);
        if (!existing) {
          const warning = JSON.stringify([record.bookId, record.id, reference.field, id]);
          if (!this.warnedDependencies.has(warning)) {
            this.warnedDependencies.add(warning);
            this.notify(record, 'SYNC_DEPENDENCY', `${reference.domain}: ${id}`);
          }
          return undefined;
        }
        resolvedIds.push(targetId);
      }
      if (resolvedIds.some((id, index) => id !== ids[index])) {
        updated = { ...updated, [reference.field]: reference.multiple ? resolvedIds : resolvedIds[0] };
      }
    }
    return updated;
  }

  private async deliver(write: PendingDomainWrite): Promise<void> {
    let record = write.record as T;
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

  private async complete(write: PendingDomainWrite, saved: T): Promise<void> {
    const queue = this.database.pendingDomainWrites;
    const indexes = this.table;
    const metadata = this.database.metadata;
    await this.database.transaction('rw', [queue, indexes, metadata], async () => {
      const key: [string, string, string] = [this.domain, write.bookId, write.id];
      const current = await queue.get(key);
      if (!current) return;
      if (write.operation === 'delete') {
        if (current.operation === 'delete' && current.revision === write.revision) {
          await indexes.delete([write.bookId, write.id]);
          await queue.delete(key);
        }
        return;
      }
      const latest = current.record as T;
      const locallyStored = await indexes.get([write.bookId, write.id]);
      if (saved.id !== write.id) {
        await indexes.delete([write.bookId, write.id]);
        await queue.delete(key);
        await metadata.put({ key: this.aliasKey(write.bookId, write.id), targetId: saved.id });
      }
      if (current.operation === 'delete' || current.deleteAfterCreate) {
        const pending: T = this.preserveFeedState(
          { ...latest, id: saved.id, itemRow: saved.itemRow || latest.itemRow, syncStatus: 'pending' },
          locallyStored,
        );
        await indexes.put(pending);
        await queue.put({ ...current, id: saved.id, operation: 'delete', state: 'queued', record: pending,
          deleteAfterCreate: false, needsItemRow: true, retryAt: 0 });
      } else if (current.revision === write.revision) {
        await indexes.put(this.preserveFeedState(saved, locallyStored));
        await queue.delete([this.domain, saved.bookId, saved.id]);
      } else {
        const updated: T = this.preserveFeedState({
          ...latest, id: saved.id, itemRow: saved.itemRow || latest.itemRow, syncStatus: 'pending',
        }, locallyStored);
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
    this.window?.dispatchEvent(new Event(WRITE_COMPLETED_EVENT));
  }

  private aliasKey(bookId: string, id: string): string {
    return `${this.domain.toLowerCase()}-id-alias:${JSON.stringify([bookId, id])}`;
  }

  private preserveFeedState(record: T, stored: T | undefined): T {
    if (!stored || this.domain === 'INDEX') return record;
    const result = { ...record };
    for (const key of ['affinity', 'forgotten', 'recalled', 'interval', 'easeFactor', 'complexity', 'lastSeen', 'lastReview', 'repetitions', 'history']) {
      if (key in stored) Object.assign(result, { [key]: stored[key] });
    }
    return result;
  }

  private async fail(write: PendingDomainWrite, error: unknown, requestStarted: boolean): Promise<void> {
    const queue = this.database.pendingDomainWrites;
    const message = error instanceof Error ? error.message : 'Synchronization failed.';
    let discarded = false;
    let discardedMayExist = false;
    let deletionSupersedesUpdate = false;
    await this.database.transaction('rw', [queue, this.table], async () => {
      const key: [string, string, string] = [this.domain, write.bookId, write.id];
      const current = await queue.get(key);
      if (!current) return;
      if (write.operation === 'create' && current.deleteAfterCreate) {
        discardedMayExist = requestStarted || !!current.createMayExist || !!current.lastError;
        await this.table.delete([write.bookId, write.id]);
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
      if (discardedMayExist) this.notify(write.record as T, 'DELETE_UNCERTAIN_CREATE', message);
    } else if (!deletionSupersedesUpdate) {
      const key = write.operation === 'delete'
        ? requestStarted ? 'DELETE_UNCERTAIN' : 'DELETE_FAILED'
        : write.operation === 'create' && requestStarted ? 'SYNC_UNCERTAIN' : 'SYNC_FAILED';
      this.notify(write.record as T, key, message);
    }
  }

  private notify(record: T, key: string, reason = '', ownerEmail = ''): void {
    this.messages.showError(this.transloco.translate(this.messageKey(key), {
      bookId: record.bookId, chapter: record['chapter'], theme: record['theme'], title: record['title'], id: record.id, reason, ownerEmail,
    }));
  }

  private messageKey(key: string): string {
    const namespace = this.domain === 'PASSAGES' ? 'PASSAGE' : this.domain === 'INDEX' ? 'INDEX' : 'SYNC';
    return `DOMAINS.${namespace}.${key}`;
  }
}
@Injectable({ providedIn: 'root' })
export class DomainWriteSyncService extends DomainWriteSyncWorker<IndexRecord> {
  protected readonly domain = 'INDEX' as const;
  protected readonly table = inject(LocalDBService).indexedDB.indexes;
  protected readonly gateway = inject(IndexGASRepository);

  saveIndex(record: IndexRecord, isEdit: boolean) { return this.save(record, isEdit); }
  deleteIndex(record: IndexRecord) { return this.delete(record); }
  getIndexWrite(record: IndexRecord) { return this.getWrite(record); }
  resolveIndexId(bookId: string, id: string) { return this.resolveId(bookId, id); }
  watchIndexWrites(bookId: string, update: (writes: PendingDomainWrite[]) => void) {
    return this.watchWrites(bookId, update);
  }
  retryIndex(record: IndexRecord, confirmAccount = false, confirmUncertain = false) {
    return this.retry(record, confirmAccount, confirmUncertain);
  }
  confirmIndexDeletion(record: IndexRecord, confirmAccount = false) {
    return this.confirmDeletion(record, confirmAccount);
  }
}

@Injectable({ providedIn: 'root' })
export class PassageWriteSyncService extends DomainWriteSyncWorker<PassageRecord> {
  protected readonly domain = 'PASSAGES' as const;
  protected readonly table = inject(LocalDBService).indexedDB.passages;
  protected readonly gateway = inject(PassageGASRepository);
}
