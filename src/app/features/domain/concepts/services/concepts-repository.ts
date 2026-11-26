import { inject, Injectable } from '@angular/core';
import { LocalDomainRepositoryAbstract } from '../../shared/domain-repository/local-domain-repository-abstract';
import { ConceptGASMapper } from '../model/concepts-gas.mapper';
import { ConceptRaw, ConceptRecord } from '../model/concepts-model';
import { ConceptGASRepository } from './concepts-gas-repository';

@Injectable({
  providedIn: 'root',
})
export class ConceptRepository extends LocalDomainRepositoryAbstract<ConceptRecord> {
  private readonly mapper = inject(ConceptGASMapper);
  private readonly gasRepository = inject(ConceptGASRepository);

  protected get localTable() {
    return this.localDBService.indexedDB.concepts;
  }

  protected get writeGateway() {
    return this.gasRepository;
  }

  async getDomain(bookRow: number, total: number | null = null): Promise<ConceptRecord[]> {
    const raws: ConceptRaw[] = await this.gasRepository.getDomain(bookRow, total);
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

    await database.transaction('rw', database.concepts, async () => {
      await database.concepts.bulkPut(persistable);
    });

    return persistable;
  }


}
