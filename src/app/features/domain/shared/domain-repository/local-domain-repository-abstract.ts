import { inject } from '@angular/core';
import { Table } from 'dexie';
import { ConfigService } from '../../../../core/services/config/config.service';
import { DomainRepositoryInterface } from '../../../../core/infrastructure/domain-repository-intreface';
import { GASPaginatedResponseRaw } from '../../../../core/infrastructure/gas/gas-model.model';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { Domain } from '../model/domain-shared-model';

interface DomainWriteGateway<TRecord> {
  addDomainItem(record: TRecord): Promise<TRecord>;
  updateDomainItem(record: TRecord): Promise<TRecord>;
  deleteDomainItem(record: TRecord): Promise<void>;
}

export abstract class LocalDomainRepositoryAbstract<TRecord extends Domain>
  implements DomainRepositoryInterface<TRecord>
{
  protected readonly configService = inject(ConfigService);
  protected readonly localDBService = inject(LocalDBService);

  protected abstract get localTable(): Table<TRecord, [string, string]>;
  protected abstract get writeGateway(): DomainWriteGateway<TRecord>;

  abstract getDomain(bookRow: number, total: number | null): Promise<TRecord[]>;

  protected async snapshotForRefresh(bookRow: number) {
    const database = this.localDBService.indexedDB;
    const book = await database.books.where('row').equals(bookRow).first();
    const records = book ? await this.localTable.where('bookId').equals(book.id).toArray() : [];
    return {
      book,
      records: new Map(records.map((record) => [record.id, JSON.stringify(record)])),
    };
  }

  protected async mergeRemoteRecords(
    records: TRecord[],
    snapshot: Awaited<ReturnType<LocalDomainRepositoryAbstract<TRecord>['snapshotForRefresh']>>,
  ): Promise<TRecord[]> {
    const bookId = snapshot.book?.id ?? records[0]?.bookId;
    if (!bookId) return records;
    const database = this.localDBService.indexedDB;
    let merged: TRecord[] = [];
    await database.transaction('rw', this.localTable, async () => {
      const local = await this.localTable.where('bookId').equals(bookId).toArray();
      const protectedRecords = local.filter((record) =>
        record.syncStatus === 'pending' || record.syncStatus === 'error' ||
        snapshot.records.get(record.id) !== JSON.stringify(record),
      );
      const protectedIds = new Set(protectedRecords.map((record) => record.id));
      const currentIds = new Set(local.map((record) => record.id));
      const deleted = new Set([...snapshot.records.keys()].filter((id) => !currentIds.has(id)));
      const remote = records.filter((record) => !protectedIds.has(record.id) && !deleted.has(record.id));
      await this.preserveLocalFeedState(remote);
      await this.localTable.bulkPut(remote);
      merged = [...remote, ...protectedRecords];
    });
    return merged;
  }

  protected async preserveLocalFeedState(
    records: (TRecord & {
      lastSeen?: Date;
      lastReview?: Date;
      interval?: number;
      forgotten?: number;
      recalled?: number;
    })[],
  ): Promise<void> {
    const existingRecords = await this.localTable.bulkGet(
      records.map((record) => [record.bookId, record.id]),
    );
    records.forEach((record, index) => {
      const localRecord = existingRecords[index];
      for (const dateField of ['lastSeen', 'lastReview'] as const) {
        const value = localRecord?.[dateField];
        if (value instanceof Date) {
          record[dateField] = value;
        }
      }
      for (const numericField of ['interval', 'forgotten', 'recalled'] as const) {
        const value = localRecord?.[numericField];
        if (typeof value === 'number' && Number.isFinite(value)) {
          record[numericField] = value;
        }
        for (const field of ['affinity', 'easeFactor', 'complexity', 'repetitions', 'history']) {
          if (localRecord && field in localRecord) Object.assign(record, { [field]: localRecord[field] });
        }
      }
    });
  }

  getDomainPaginated(
    _row: number,
    _page: number,
    _pageSize: number | null,
  ): Promise<GASPaginatedResponseRaw<TRecord>> {
    throw new Error('Method not implemented.');
  }

  async addDomainItem(record: TRecord): Promise<TRecord> {
    const table = this.localTable;
    const pendingRecord: TRecord = { ...record, syncStatus: 'pending' };

    if (this.configService.isLocalSampleDataEnabled()) {
      await table.put(pendingRecord);
      return pendingRecord;
    }

    await table.put(pendingRecord);

    try {
      const syncedRecord = await this.writeGateway.addDomainItem(pendingRecord);
      await this.localDBService.indexedDB.transaction('rw', table, async () => {
        if (syncedRecord.id !== pendingRecord.id) {
          await table.delete([pendingRecord.bookId, pendingRecord.id]);
        }
        await table.put(syncedRecord);
      });
      return syncedRecord;
    } catch (error) {
      await table.put({ ...pendingRecord, syncStatus: 'error' });
      throw error;
    }
  }

  async updateDomainItem(record: TRecord): Promise<TRecord> {
    const table = this.localTable;
    const pendingRecord: TRecord = { ...record, syncStatus: 'pending' };

    if (this.configService.isLocalSampleDataEnabled()) {
      await table.put(pendingRecord);
      return pendingRecord;
    }

    await table.put(pendingRecord);

    try {
      const syncedRecord = await this.writeGateway.updateDomainItem(pendingRecord);
      await table.put(syncedRecord);
      return syncedRecord;
    } catch (error) {
      await table.put({ ...pendingRecord, syncStatus: 'error' });
      throw error;
    }
  }

  async deleteDomainItem(record: TRecord): Promise<void> {
    if (!this.configService.isLocalSampleDataEnabled()) {
      await this.writeGateway.deleteDomainItem(record);
    }
    await this.localTable.delete([record.bookId, record.id]);
  }
}