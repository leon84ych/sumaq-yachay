import { inject, Injectable } from '@angular/core';
import { LocalDomainRepositoryAbstract } from '../../shared/domain-repository/local-domain-repository-abstract';
import { BookEventGASMapper } from '../model/book-events-gas.mapper';
import { BookEventRaw, EventRecord } from '../model/event-model';
import { BookEventGASRepository } from './book-events-gas-repository';

@Injectable({ providedIn: 'root' })
export class BookEventRepository extends LocalDomainRepositoryAbstract<EventRecord> {
  private readonly mapper = inject(BookEventGASMapper);
  private readonly gasRepository = inject(BookEventGASRepository);

  protected get localTable() {
    return this.localDBService.indexedDB.bookEvents;
  }

  protected get writeGateway() {
    return this.gasRepository;
  }

  async getDomain(bookRow: number, total: number | null = null): Promise<EventRecord[]> {
    const raws: BookEventRaw[] = await this.gasRepository.getDomain(bookRow, total);
    const database = this.localDBService.indexedDB;
    const ownerBook = raws.some((raw) => !raw.bookId)
      ? await database.books.where('row').equals(bookRow).first()
      : undefined;

    const records = raws.map((raw, index) => {
      const record = this.mapper.toRecord({
        ...raw,
        bookId: raw.bookId || (ownerBook?.id ?? ''),
        itemRow: raw.itemRow || index + 1,
      });
      return { ...record, bookRow };
    });
    const persistable = records.filter((record) => record.bookId);

    await database.transaction('rw', database.bookEvents, async () => {
      await this.preserveLocalFeedState(persistable);
      await database.bookEvents.bulkPut(persistable);
    });

    return persistable;
  }


}
