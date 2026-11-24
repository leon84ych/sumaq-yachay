import { inject, Injectable } from '@angular/core';
import { DomainRepositoryInterface } from '../../../../core/infrastructure/domain-repository-intreface';
import { GASPaginatedResponseRaw } from '../../../../core/infrastructure/gas/gas-model.model';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { GlossaryGASMapper } from '../model/glossary-gas.mapper';
import { GlossaryRaw, GlossaryRecord } from '../model/glossary-model';
import { GlossaryGASRepository } from './glossary-gas-repository';

@Injectable({ providedIn: 'root' })
export class GlossaryRepository implements DomainRepositoryInterface<GlossaryRecord> {
  private readonly mapper = inject(GlossaryGASMapper);
  private readonly gasRepository = inject(GlossaryGASRepository);
  private readonly localDBService = inject(LocalDBService);

  async getDomain(bookRow: number, total: number | null = null): Promise<GlossaryRecord[]> {
    const raws: GlossaryRaw[] = await this.gasRepository.getDomain(bookRow, total);
    const database = this.localDBService.indexedDB;
    const ownerBook = raws.some((raw) => !raw.bookId)
      ? await database.books.where('row').equals(bookRow).first()
      : undefined;

    const records = raws.map((raw) => ({
      ...this.mapper.toRecord({ ...raw, bookId: raw.bookId || (ownerBook?.id ?? '') }),
      bookRow,
    }));
    const persistable = records.filter((record) => record.bookId);

    await database.transaction('rw', database.glossary, async () => {
      await database.glossary.bulkPut(persistable);
    });

    return persistable;
  }

  getDomainPaginated(
    _row: number,
    _page: number,
    _pageSize: number | null,
  ): Promise<GASPaginatedResponseRaw<GlossaryRecord>> {
    throw new Error('Method not implemented.');
  }

  async addDomainItem(record: GlossaryRecord): Promise<GlossaryRecord> {
    const table = this.localDBService.indexedDB.glossary;
    const pendingRecord: GlossaryRecord = { ...record, syncStatus: 'pending' };
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

  async updateDomainItem(record: GlossaryRecord): Promise<GlossaryRecord> {
    const table = this.localDBService.indexedDB.glossary;
    const pendingRecord: GlossaryRecord = { ...record, syncStatus: 'pending' };
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

  async deleteDomainItem(record: GlossaryRecord): Promise<void> {
    await this.gasRepository.deleteDomainItem(record);
    await this.localDBService.indexedDB.glossary.delete([record.bookId, record.id]);
  }
}
