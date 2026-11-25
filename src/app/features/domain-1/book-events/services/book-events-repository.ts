import { inject, Injectable } from '@angular/core';
import { DomainRepositoryInterface } from '../../../../core/infrastructure/domain-repository-intreface';
import { GASPaginatedResponseRaw } from '../../../../core/infrastructure/gas/gas-model.model';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { BookEventGASMapper } from '../model/book-events-gas.mapper';
import { BookEventRaw, BookEventRecord } from '../model/book-events-model';
import { BookEventGASRepository } from './book-events-gas-repository';

@Injectable({ providedIn: 'root' })
export class BookEventRepository implements DomainRepositoryInterface<BookEventRecord> {
  private readonly mapper = inject(BookEventGASMapper);
  private readonly gasRepository = inject(BookEventGASRepository);
  private readonly localDBService = inject(LocalDBService);

  async getDomain(bookRow: number, total: number | null = null): Promise<BookEventRecord[]> {
    const raws: BookEventRaw[] = await this.gasRepository.getDomain(bookRow, total);
    const database = this.localDBService.indexedDB;
    const ownerBook = raws.some((raw) => !raw.bookId)
      ? await database.books.where('row').equals(bookRow).first()
      : undefined;

    const records = raws.map((raw, index) => {
      const record = this.mapper.toRecord({
        ...raw,
        bookId: raw.bookId || (ownerBook?.id ?? ''),
        itemRow: raw.itemRow || index + 1,
      });
      return { ...record, bookRow };
    });
    const persistable = records.filter((record) => record.bookId);

    await database.transaction('rw', database.bookEvents, async () => {
      await database.bookEvents.bulkPut(persistable);
    });

    return persistable;
  }

  getDomainPaginated(
    _row: number,
    _page: number,
    _pageSize: number | null,
  ): Promise<GASPaginatedResponseRaw<BookEventRecord>> {
    throw new Error('Method not implemented.');
  }

  async addDomainItem(record: BookEventRecord): Promise<BookEventRecord> {
    const table = this.localDBService.indexedDB.bookEvents;
    const pendingRecord: BookEventRecord = { ...record, syncStatus: 'pending' };
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

  async updateDomainItem(record: BookEventRecord): Promise<BookEventRecord> {
    const table = this.localDBService.indexedDB.bookEvents;
    const pendingRecord: BookEventRecord = { ...record, syncStatus: 'pending' };
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

  async deleteDomainItem(record: BookEventRecord): Promise<void> {
    await this.gasRepository.deleteDomainItem(record);
    await this.localDBService.indexedDB.bookEvents.delete([record.bookId, record.id]);
  }
}
