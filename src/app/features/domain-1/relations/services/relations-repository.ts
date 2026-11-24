import { inject, Injectable } from '@angular/core';
import { DomainRepositoryInterface } from '../../../../core/infrastructure/domain-repository-intreface';
import { GASPaginatedResponseRaw } from '../../../../core/infrastructure/gas/gas-model.model';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { RelationGASMapper } from '../model/relations-gas.mapper';
import { RelationRaw, RelationRecord } from '../model/relations-model';
import { RelationGASRepository } from './relations-gas-repository';

@Injectable({ providedIn: 'root' })
export class RelationRepository implements DomainRepositoryInterface<RelationRecord> {
  private readonly mapper = inject(RelationGASMapper);
  private readonly gasRepository = inject(RelationGASRepository);
  private readonly localDBService = inject(LocalDBService);

  async getDomain(bookRow: number, total: number | null = null): Promise<RelationRecord[]> {
    const raws: RelationRaw[] = await this.gasRepository.getDomain(bookRow, total);
    const database = this.localDBService.indexedDB;
    const ownerBook = raws.some((raw) => !raw.bookId)
      ? await database.books.where('row').equals(bookRow).first()
      : undefined;

    const records = raws.map((raw) => ({
      ...this.mapper.toRecord({ ...raw, bookId: raw.bookId || (ownerBook?.id ?? '') }),
      bookRow,
    }));
    const persistable = records.filter((record) => record.bookId);

    await database.transaction('rw', database.relations, async () => {
      await database.relations.bulkPut(persistable);
    });

    return persistable;
  }

  getDomainPaginated(
    _row: number,
    _page: number,
    _pageSize: number | null,
  ): Promise<GASPaginatedResponseRaw<RelationRecord>> {
    throw new Error('Method not implemented.');
  }

  async addDomainItem(record: RelationRecord): Promise<RelationRecord> {
    const table = this.localDBService.indexedDB.relations;
    const pendingRecord: RelationRecord = { ...record, syncStatus: 'pending' };
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

  async updateDomainItem(record: RelationRecord): Promise<RelationRecord> {
    const table = this.localDBService.indexedDB.relations;
    const pendingRecord: RelationRecord = { ...record, syncStatus: 'pending' };
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

  async deleteDomainItem(record: RelationRecord): Promise<void> {
    await this.gasRepository.deleteDomainItem(record);
    await this.localDBService.indexedDB.relations.delete([record.bookId, record.id]);
  }
}
