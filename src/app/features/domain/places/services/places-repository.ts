import { inject, Injectable } from '@angular/core';
import { LocalDomainRepositoryAbstract } from '../../shared/domain-repository/local-domain-repository-abstract';
import { PlaceGASMapper } from '../model/places-gas.mapper';
import { PlaceRaw, PlaceRecord } from '../model/places-model';
import { PlaceGASRepository } from './places-gas-repository';

@Injectable({ providedIn: 'root' })
export class PlaceRepository extends LocalDomainRepositoryAbstract<PlaceRecord> {
  private readonly mapper = inject(PlaceGASMapper);
  private readonly gasRepository = inject(PlaceGASRepository);

  protected get localTable() {
    return this.localDBService.indexedDB.places;
  }

  protected get writeGateway() {
    return this.gasRepository;
  }

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
      await this.preserveLocalFeedState(persistable);
      await database.places.bulkPut(persistable);
    });

    return persistable;
  }


}
