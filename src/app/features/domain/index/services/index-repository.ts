import { inject, Injectable } from "@angular/core";
import { IndexRaw, IndexRecord } from "../model/index-model";
import { IndexGASMapper } from "../model/index-gas.mapper";
import { IndexGASRepository } from "./index-gas-repository";
import { LocalDomainRepositoryAbstract } from "../../shared/domain-repository/local-domain-repository-abstract";




@Injectable({
  providedIn: 'root',
})
export class IndexRepository extends LocalDomainRepositoryAbstract<IndexRecord> {

  private mapper = inject(IndexGASMapper);
  private gasRepository = inject(IndexGASRepository);

  protected get localTable() {
    return this.localDBService.indexedDB.indexes;
  }

  protected get writeGateway() {
    return this.gasRepository;
  }

  async getDomain(bookRow: number, total: number | null = null): Promise<IndexRecord[]> {
    const database = this.localDBService.indexedDB;
    const book = await database.books.where('row').equals(bookRow).first();
    const initialRecords = book
      ? await database.indexes.where('bookId').equals(book.id).toArray()
      : [];
    const initialById = new Map(initialRecords.map((record) => [record.id, JSON.stringify(record)]));
    const domain: IndexRaw[] = await this.gasRepository.getDomain(bookRow, total);
    const domainRecords = domain.map((item) => ({
      ...this.mapper.toRecord({ ...item, bookId: item.bookId || book?.id || '' }),
      bookRow,
    })).filter((record) => record.bookId);

    const bookId = book?.id ?? domainRecords[0]?.bookId;
    if (!bookId) return domainRecords;

    let mergedRecords: IndexRecord[] = [];
    await database.transaction('rw', database.indexes, async () => {
      const localRecords = await database.indexes.where('bookId').equals(bookId).toArray();
      const protectedRecords = localRecords.filter(
        (record) => record.syncStatus === 'pending' || record.syncStatus === 'error' ||
          initialById.get(record.id) !== JSON.stringify(record),
      );
      const protectedIds = new Set(protectedRecords.map((record) => record.id));
      const currentIds = new Set(localRecords.map((record) => record.id));
      const deletedDuringRefresh = new Set([...initialById.keys()].filter((id) => !currentIds.has(id)));
      const remoteRecords = domainRecords.filter((record) =>
        !protectedIds.has(record.id) && !deletedDuringRefresh.has(record.id),
      );
      const remoteIds = new Set(remoteRecords.map((record) => record.id));
      const removedIds = localRecords
        .filter((record) => record.syncStatus === 'synced' && !protectedIds.has(record.id) && !remoteIds.has(record.id))
        .map((record) => [record.bookId, record.id] as [string, string]);

      await Promise.all(removedIds.map((key) => database.indexes.delete(key)));
      if (remoteRecords.length > 0) await database.indexes.bulkPut(remoteRecords);
      mergedRecords = [...remoteRecords, ...protectedRecords].sort((left, right) => left.itemRow - right.itemRow);
    });

        return mergedRecords;
  }



}