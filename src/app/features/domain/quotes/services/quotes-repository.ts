import { inject, Injectable } from '@angular/core';
import { DomainRepositoryInterface } from '../../../../core/infrastructure/domain-repository-intreface';
import { GASPaginatedResponseRaw } from '../../../../core/infrastructure/gas/gas-model.model';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { QuoteGASMapper } from '../model/quotes-gas.mapper';
import { QuoteRaw, QuoteRecord } from '../model/quotes-model';
import { QuoteGASRepository } from './quotes-gas-repository';

@Injectable({
  providedIn: 'root',
})
export class QuoteRepository implements DomainRepositoryInterface<QuoteRecord> {
  private readonly mapper = inject(QuoteGASMapper);
  private readonly gasRepository = inject(QuoteGASRepository);
  private readonly localDBService = inject(LocalDBService);

  async getDomain(bookRow: number, total: number | null = null): Promise<QuoteRecord[]> {
    const raws: QuoteRaw[] = await this.gasRepository.getDomain(bookRow, total);
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

    await database.transaction('rw', database.quotes, async () => {
      await database.quotes.bulkPut(persistable);
    });

    return persistable;
  }

  getDomainPaginated(
    _row: number,
    _page: number,
    _pageSize: number | null,
  ): Promise<GASPaginatedResponseRaw<QuoteRecord>> {
    throw new Error('Method not implemented.');
  }

  async addDomainItem(record: QuoteRecord): Promise<QuoteRecord> {
    const table = this.localDBService.indexedDB.quotes;
    const pendingRecord: QuoteRecord = { ...record, syncStatus: 'pending' };
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

  async updateDomainItem(record: QuoteRecord): Promise<QuoteRecord> {
    const table = this.localDBService.indexedDB.quotes;
    const pendingRecord: QuoteRecord = { ...record, syncStatus: 'pending' };
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

  async deleteDomainItem(record: QuoteRecord): Promise<void> {
    // Local data is removed only after GAS confirms the delete.
    await this.gasRepository.deleteDomainItem(record);
    await this.localDBService.indexedDB.quotes.delete([record.bookId, record.id]);
  }
}
