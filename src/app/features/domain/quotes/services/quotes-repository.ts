import { inject, Injectable } from '@angular/core';
import { LocalDomainRepositoryAbstract } from '../../shared/domain-repository/local-domain-repository-abstract';
import { QuoteGASMapper } from '../model/quotes-gas.mapper';
import { QuoteRaw, QuoteRecord } from '../model/quotes-model';
import { QuoteGASRepository } from './quotes-gas-repository';

@Injectable({
  providedIn: 'root',
})
export class QuoteRepository extends LocalDomainRepositoryAbstract<QuoteRecord> {
  private readonly mapper = inject(QuoteGASMapper);
  private readonly gasRepository = inject(QuoteGASRepository);

  protected get localTable() {
    return this.localDBService.indexedDB.quotes;
  }

  protected get writeGateway() {
    return this.gasRepository;
  }

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


}
