import { inject, Injectable } from '@angular/core';
import { LocalDomainRepositoryAbstract } from '../../shared/domain-repository/local-domain-repository-abstract';
import { GlossaryGASMapper } from '../model/glossary-gas.mapper';
import { GlossaryRaw, GlossaryRecord } from '../model/glossary-model';
import { GlossaryGASRepository } from './glossary-gas-repository';

@Injectable({ providedIn: 'root' })
export class GlossaryRepository extends LocalDomainRepositoryAbstract<GlossaryRecord> {
  private readonly mapper = inject(GlossaryGASMapper);
  private readonly gasRepository = inject(GlossaryGASRepository);

  protected get localTable() {
    return this.localDBService.indexedDB.glossary;
  }

  protected get writeGateway() {
    return this.gasRepository;
  }

  async getDomain(bookRow: number, total: number | null = null): Promise<GlossaryRecord[]> {
    const raws: GlossaryRaw[] = await this.gasRepository.getDomain(bookRow, total);
    const database = this.localDBService.indexedDB;
    const ownerBook = raws.some((raw) => !raw.bookId)
      ? await database.books.where('row').equals(bookRow).first()
      : undefined;

    const records = raws.map((raw) => ({
      ...this.mapper.toRecord({ ...raw, bookId: raw.bookId || (ownerBook?.id ?? '') }),
      bookRow,
    }));
    const persistable = records.filter((record) => record.bookId);

    await database.transaction('rw', database.glossary, async () => {
      await database.glossary.bulkPut(persistable);
    });

    return persistable;
  }


}
