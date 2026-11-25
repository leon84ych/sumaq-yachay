import { inject, Injectable } from '@angular/core';
import { DomainRepositoryInterface } from '../../../../core/infrastructure/domain-repository-intreface';
import { GASPaginatedResponseRaw } from '../../../../core/infrastructure/gas/gas-model.model';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { PlaceGASMapper } from '../model/places-gas.mapper';
import { PlaceRaw, PlaceRecord } from '../model/places-model';
import { PlaceGASRepository } from './places-gas-repository';

@Injectable({ providedIn: 'root' })
export class PlaceRepository implements DomainRepositoryInterface<PlaceRecord> {
  private readonly mapper = inject(PlaceGASMapper);
  private readonly gasRepository = inject(PlaceGASRepository);
  private readonly localDBService = inject(LocalDBService);

  async getDomain(bookRow: number, total: number | null = null): Promise<PlaceRecord[]> {
    const raws: PlaceRaw[] = await this.gasRepository.getDomain(bookRow, total);
    const database = this.localDBService.indexedDB;
    const ownerBook = raws.some((raw) => !raw.bookId)
      ? await database.books.where('row').equals(bookRow).first()
      : undefined;

    const records = raws.map((raw) => ({
      ...this.mapper.toRecord({ ...raw, bookId: raw.bookId || (ownerBook?.id ?? '') }),
      bookRow,
    }));
    const persistable = records.filter((record) => record.bookId);

    await database.transaction('rw', database.places, async () => {
      await database.places.bulkPut(persistable);
    });

    return persistable;
  }

  getDomainPaginated(
    _row: number,
    _page: number,
    _pageSize: number | null,
  ): Promise<GASPaginatedResponseRaw<PlaceRecord>> {
    throw new Error('Method not implemented.');
  }

  async addDomainItem(record: PlaceRecord): Promise<PlaceRecord> {
    const table = this.localDBService.indexedDB.places;
    const pendingRecord: PlaceRecord = { ...record, syncStatus: 'pending' };
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

  async updateDomainItem(record: PlaceRecord): Promise<PlaceRecord> {
    const table = this.localDBService.indexedDB.places;
    const pendingRecord: PlaceRecord = { ...record, syncStatus: 'pending' };
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

  async deleteDomainItem(record: PlaceRecord): Promise<void> {
    await this.gasRepository.deleteDomainItem(record);
    await this.localDBService.indexedDB.places.delete([record.bookId, record.id]);
  }
}
