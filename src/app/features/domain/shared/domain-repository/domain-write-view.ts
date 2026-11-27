import { DestroyRef, inject, Signal, signal, WritableSignal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { DomainName } from '../../../catalog/book-detail/models/domain-sheet-config';
import { Domain } from '../model/domain-shared-model';
import { AllDomainWriteSyncService } from './all-domain-write-sync.service';

export class DomainWriteView<T extends Domain> {
  private readonly sync = inject(AllDomainWriteSyncService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messages = inject(GlobalMessageService);
  private readonly transloco = inject(TranslocoService);
  private editingOriginal?: T;
  private hasObservedRecords = false;
  private readonly relatedDomains = new Set<DomainName>();
  readonly retryableIds = signal<ReadonlySet<string>>(new Set());
  readonly pendingDeletionIds = signal<ReadonlySet<string>>(new Set());

  constructor(
    private readonly domain: DomainName,
    private readonly bookId: Signal<string>,
    private readonly rows: WritableSignal<T[]>,
  ) {}

  observe(): void {
    const bookId = this.bookId();
    const records = this.sync.watchRecords<T>(this.domain, bookId, (rows) => {
      if (this.bookId() === bookId) {
        this.hasObservedRecords = true;
        this.rows.set(rows);
      }
    });
    const writes = this.sync.watchWrites(this.domain, bookId, (entries) => {
      this.retryableIds.set(
        new Set(entries.filter((entry) => entry.state !== 'sending').map((entry) => entry.id)),
      );
      this.pendingDeletionIds.set(
        new Set(
          entries
            .filter((entry) => entry.operation === 'delete' || entry.deleteAfterCreate)
            .map((entry) => entry.id),
        ),
      );
    });
    this.destroyRef.onDestroy(() => {
      records.unsubscribe();
      writes.unsubscribe();
    });
  }

  initialize(records: T[]): void {
    if (!this.hasObservedRecords) this.rows.set(records);
  }

  observeRelated<R extends Domain>(
    domain: DomainName,
    rows: WritableSignal<R[]>,
    selections: WritableSignal<string>[],
    multiple?: WritableSignal<string[]>,
  ): void {
    if (this.relatedDomains.has(domain)) return;
    this.relatedDomains.add(domain);
    const bookId = this.bookId();
    const subscription = this.sync.watchRecords<R>(domain, bookId, (records) => {
      if (this.bookId() !== bookId) return;
      rows.set(records);
      void this.resolveSelections(domain, bookId, selections, multiple);
    });
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  private async resolveSelections(
    domain: DomainName,
    bookId: string,
    selections: WritableSignal<string>[],
    multiple?: WritableSignal<string[]>,
  ): Promise<void> {
    try {
      for (const selection of selections) {
        const id = selection();
        if (!id) continue;
        const resolved = await this.sync.resolveStoredId(domain, bookId, id);
        if (selection() === id) selection.set(resolved);
      }
      if (multiple) {
        const ids = multiple();
        const resolved = await Promise.all(
          ids.map((id) => this.sync.resolveStoredId(domain, bookId, id)),
        );
        if (multiple() === ids) multiple.set(resolved);
      }
    } catch (error) {
      this.messages.showError(
        error instanceof Error ? error.message : 'Failed to resolve linked entries.',
      );
    }
  }

  startEdit(record: T): boolean {
    if (this.pendingDeletionIds().has(record.id)) return false;
    this.editingOriginal = record;
    return true;
  }

  clearEdit(): void {
    this.editingOriginal = undefined;
  }

  original(id: string | null): T | undefined {
    if (!id) return undefined;
    const resolved = this.sync.resolveId(this.domain, this.bookId(), id);
    return this.rows().find((row) => row.id === resolved || row.id === id) ?? this.editingOriginal;
  }

  async save(record: T, editingId: string | null): Promise<T> {
    const saved = await this.sync.save(this.domain, record, !!editingId);
    this.hasObservedRecords = true;
    this.rows.update((rows) => {
      const matches = (row: T) =>
        row.id === editingId || row.id === record.id || row.id === saved.id;
      const index = rows.findIndex(matches);
      return index < 0
        ? [...rows, saved]
        : rows.flatMap((row, i) => (i === index ? [saved] : matches(row) ? [] : [row]));
    });
    return saved;
  }

  async delete(record: T): Promise<void> {
    const result = await this.sync.delete(this.domain, record);
    this.hasObservedRecords = true;
    if (result === 'deleted') {
      this.rows.update((rows) => rows.filter((row) => row.id !== record.id));
    } else {
      this.pendingDeletionIds.update((ids) => new Set([...ids, record.id]));
      this.rows.update((rows) =>
        rows.map((row) => (row.id === record.id ? { ...row, syncStatus: 'pending' } : row)),
      );
    }
  }

  async retry(record: T): Promise<void> {
    try {
      const write = await this.sync.getWrite(this.domain, record);
      if (!write) return;
      const account = this.sync.getActiveAccount();
      if (!account || (write.ownerEmail && write.ownerEmail !== account.toLowerCase())) {
        await this.sync.retry(this.domain, record);
        return;
      }
      let confirmedAccount = false;
      if (!write.ownerEmail) {
        if (
          !window.confirm(
            this.transloco.translate('DOMAINS.INDEX.CONFIRM_SYNC_ACCOUNT', { account }),
          )
        )
          return;
        confirmedAccount = true;
      }
      if (
        write.state === 'uncertain' &&
        write.operation === 'create' &&
        !window.confirm(this.transloco.translate('DOMAINS.INDEX.CONFIRM_UNCERTAIN_RETRY'))
      )
        return;
      if (write.state === 'uncertain' && write.operation === 'delete') {
        if (window.confirm(this.transloco.translate('DOMAINS.INDEX.CONFIRM_DELETE_ALREADY_DONE'))) {
          await this.sync.confirmDeletion(this.domain, record, confirmedAccount);
          return;
        }
        if (
          !window.confirm(this.transloco.translate('DOMAINS.INDEX.CONFIRM_UNCERTAIN_DELETE_RETRY'))
        )
          return;
      }
      await this.sync.retry(this.domain, record, confirmedAccount, write.state === 'uncertain');
    } catch (error) {
      this.messages.showError(
        error instanceof Error ? error.message : 'Failed to retry synchronization.',
      );
    }
  }
}
