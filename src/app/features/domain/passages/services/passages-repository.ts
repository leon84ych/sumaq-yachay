import { inject, Injectable } from '@angular/core';
import { LocalDomainRepositoryAbstract } from '../../shared/domain-repository/local-domain-repository-abstract';
import { PassageGASMapper } from '../model/passages-gas.mapper';
import { PassageRaw, PassageRecord } from '../model/passages-model';
import { PassageGASRepository } from './passages-gas-repository';

@Injectable({
  providedIn: 'root',
})
export class PassageRepository extends LocalDomainRepositoryAbstract<PassageRecord> {
  private readonly mapper = inject(PassageGASMapper);
  private readonly gasRepository = inject(PassageGASRepository);

  protected get localTable() {
    return this.localDBService.indexedDB.passages;
  }

  protected get writeGateway() {
    return this.gasRepository;
  }

  async getDomain(bookRow: number, total: number | null = null): Promise<PassageRecord[]> {
    const database = this.localDBService.indexedDB;
    const ownerBook = await database.books.where('row').equals(bookRow).first();
    const initialRecords = ownerBook
      ? await database.passages.where('bookId').equals(ownerBook.id).toArray()
      : [];
    const initialById = new Map(initialRecords.map((record) => [record.id, JSON.stringify(record)]));
    const raws: PassageRaw[] = await this.gasRepository.getDomain(bookRow, total);

    // Rows from GAS may omit the owning book; the fetch argument is the source of truth.
    const records = raws.map((raw) => ({
      ...this.mapper.toRecord({ ...raw, bookId: raw.bookId || (ownerBook?.id ?? '') }),
      bookRow,
    }));
    const persistable = records.filter((record) => record.bookId);

    const bookId = ownerBook?.id ?? persistable[0]?.bookId;
    if (!bookId) return persistable;
    let merged: PassageRecord[] = [];
    await database.transaction('rw', database.passages, async () => {
      const local = await database.passages.where('bookId').equals(bookId).toArray();
      const protectedRecords = local.filter((record) =>
        record.syncStatus === 'pending' || record.syncStatus === 'error' ||
        initialById.get(record.id) !== JSON.stringify(record),
      );
      const protectedIds = new Set(protectedRecords.map((record) => record.id));
      const currentIds = new Set(local.map((record) => record.id));
      const deletedIds = new Set([...initialById.keys()].filter((id) => !currentIds.has(id)));
      const remote = persistable.filter((record) =>
        !protectedIds.has(record.id) && !deletedIds.has(record.id),
      );
      await this.preserveLocalFeedState(remote);
      await database.passages.bulkPut(remote);
      merged = [...remote, ...protectedRecords];
    });

    return merged;
  }


}
