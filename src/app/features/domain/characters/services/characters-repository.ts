import { inject, Injectable } from '@angular/core';
import { DomainRepositoryInterface } from '../../../../core/infrastructure/domain-repository-intreface';
import { GASPaginatedResponseRaw } from '../../../../core/infrastructure/gas/gas-model.model';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { CharacterGASMapper } from '../model/characters-gas.mapper';
import { CharacterRaw, CharacterRecord } from '../model/characters-model';
import { CharacterGASRepository } from './characters-gas-repository';

@Injectable({ providedIn: 'root' })
export class CharacterRepository implements DomainRepositoryInterface<CharacterRecord> {
  private readonly mapper = inject(CharacterGASMapper);
  private readonly gasRepository = inject(CharacterGASRepository);
  private readonly localDBService = inject(LocalDBService);

  async getDomain(bookRow: number, total: number | null = null): Promise<CharacterRecord[]> {
    const raws: CharacterRaw[] = await this.gasRepository.getDomain(bookRow, total);
    const database = this.localDBService.indexedDB;
    const ownerBook = raws.some((raw) => !raw.bookId)
      ? await database.books.where('row').equals(bookRow).first()
      : undefined;

    const records = raws.map((raw) => ({
      ...this.mapper.toRecord({ ...raw, bookId: raw.bookId || (ownerBook?.id ?? '') }),
      bookRow,
    }));
    const persistable = records.filter((record) => record.bookId);

    await database.transaction('rw', database.characters, async () => {
      await database.characters.bulkPut(persistable);
    });

    return persistable;
  }

  getDomainPaginated(
    _row: number,
    _page: number,
    _pageSize: number | null,
  ): Promise<GASPaginatedResponseRaw<CharacterRecord>> {
    throw new Error('Method not implemented.');
  }

  async addDomainItem(record: CharacterRecord): Promise<CharacterRecord> {
    const table = this.localDBService.indexedDB.characters;
    const pendingRecord: CharacterRecord = { ...record, syncStatus: 'pending' };
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

  async updateDomainItem(record: CharacterRecord): Promise<CharacterRecord> {
    const table = this.localDBService.indexedDB.characters;
    const pendingRecord: CharacterRecord = { ...record, syncStatus: 'pending' };
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

  async deleteDomainItem(record: CharacterRecord): Promise<void> {
    await this.gasRepository.deleteDomainItem(record);
    await this.localDBService.indexedDB.characters.delete([record.bookId, record.id]);
  }
}
