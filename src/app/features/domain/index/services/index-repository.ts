import { inject, Injectable } from "@angular/core";
import { IndexRaw, IndexRecord } from "../model/index-model";
import { IndexGASMapper } from "../model/index-gas.mapper";
import { DomainRepositoryInterface } from "../../../../core/infrastructure/domain-repository-intreface";
import { IndexGASRepository } from "./index-gas-repository";
import { LocalDBService } from "../../../../shared/local-db/local-db.service";
import { GASPaginatedResponseRaw } from "../../../../core/infrastructure/gas/gas-model.model";




@Injectable({
  providedIn: 'root',
})
export class IndexRepository implements DomainRepositoryInterface<IndexRecord> {

  private mapper = inject(IndexGASMapper);
  private gasRepository = inject(IndexGASRepository);
  private localDBService = inject(LocalDBService);

  async getDomain(bookRow: number, total: number | null = null): Promise<IndexRecord[]> {
    const domain: IndexRaw[] = await this.gasRepository.getDomain(bookRow, total);
    const database = this.localDBService.indexedDB;
    const book = await database.books.where('row').equals(bookRow).first();
    const domainRecords = domain.map((item) => ({
      ...this.mapper.toRecord({ ...item, bookId: item.bookId || book?.id || '' }),
      bookRow,
    })).filter((record) => record.bookId);

    if (domainRecords.length === 0) {
      return [];
    }

    await database.transaction('rw', database.indexes, async () => {
      await database.indexes.bulkPut(domainRecords);
    });

    return domainRecords.sort((left, right) => left.itemRow - right.itemRow);
  }

  getDomainPaginated(row: number, page: number, pageSize: number|null): Promise<GASPaginatedResponseRaw<IndexRecord>> {
    throw new Error("Method not implemented.");
  }

  async addDomainItem(record: IndexRecord): Promise<IndexRecord> {
    const table = this.localDBService.indexedDB.indexes;
    const pendingRecord: IndexRecord = { ...record, syncStatus: 'pending' };
    await table.put(pendingRecord);

    try {
      const addedRecord = await this.gasRepository.addDomainItem(pendingRecord);
      const syncedRecord: IndexRecord = {
        ...addedRecord
      };

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
  
  async updateDomainItem(record: IndexRecord): Promise<IndexRecord> {
    const table = this.localDBService.indexedDB.indexes;
    const pendingRecord: IndexRecord = { ...record, syncStatus: 'pending' };
    await table.put(pendingRecord);

    try {
      const syncedRecord = await this.gasRepository.updateDomainItem(pendingRecord);
      await table.put(syncedRecord);
      return syncedRecord;
    } catch (error) {
      await table.put({ ...pendingRecord, syncStatus: 'error' });
      throw error;
    }
  }

  async deleteDomainItem(record: IndexRecord): Promise<void> {
    await this.gasRepository.deleteDomainItem(record);
    await this.localDBService.indexedDB.indexes.delete([record.bookId, record.id]);
  }








}