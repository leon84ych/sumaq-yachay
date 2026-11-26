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


}
