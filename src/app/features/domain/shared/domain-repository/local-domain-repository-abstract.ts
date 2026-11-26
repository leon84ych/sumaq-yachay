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