import { inject, Injectable } from '@angular/core';
import { DomainRepositoryInterface } from '../../../../core/infrastructure/domain-repository-intreface';
import { GASPaginatedResponseRaw } from '../../../../core/infrastructure/gas/gas-model.model';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { PassageGASMapper } from '../model/passages-gas.mapper';
import { PassageRaw, PassageRecord } from '../model/passages-model';
import { PassageGASRepository } from './passages-gas-repository';

@Injectable({
  providedIn: 'root',
})
export class PassageRepository implements DomainRepositoryInterface<PassageRecord> {
  private readonly mapper = inject(PassageGASMapper);
  private readonly gasRepository = inject(PassageGASRepository);
  private readonly localDBService = inject(LocalDBService);

  async getDomain(bookRow: number, total: number | null = null): Promise<PassageRecord[]> {
    const raws: PassageRaw[] = await this.gasRepository.getDomain(bookRow, total);
    const database = this.localDBService.indexedDB;
    const ownerBook = raws.some((raw) => !raw.bookId)
      ? await database.books.where('row').equals(bookRow).first()
      : undefined;

    // Rows from GAS may omit the owning book; the fetch argument is the source of truth.
    const records = raws.map((raw) => ({
      ...this.mapper.toRecord({ ...raw, bookId: raw.bookId || (ownerBook?.id ?? '') }),
      bookRow,
    }));
    const persistable = records.filter((record) => record.bookId);

    await database.transaction('rw', database.passages, async () => {
      await database.passages.bulkPut(persistable);
    });

    return persistable;
  }

  getDomainPaginated(
    _row: number,
    _page: number,
    _pageSize: number | null,
  ): Promise<GASPaginatedResponseRaw<PassageRecord>> {
    throw new Error('Method not implemented.');
  }

  async addDomainItem(record: PassageRecord): Promise<PassageRecord> {
    const table = this.localDBService.indexedDB.passages;
    const pendingRecord: PassageRecord = { ...record, syncStatus: 'pending' };
    await table.put(pendingRecord);

    try {
      const syncedRecord = await this.gasRepository.addDomainItem(pendingRecord);

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

  async updateDomainItem(record: PassageRecord): Promise<PassageRecord> {
    const table = this.localDBService.indexedDB.passages;
    const pendingRecord: PassageRecord = { ...record, syncStatus: 'pending' };
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

  async deleteDomainItem(record: PassageRecord): Promise<void> {
    // Local data is removed only after GAS confirms the delete.
    await this.gasRepository.deleteDomainItem(record);
    await this.localDBService.indexedDB.passages.delete([record.bookId, record.id]);
  }
}
