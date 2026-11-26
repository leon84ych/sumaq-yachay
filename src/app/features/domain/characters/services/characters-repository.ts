import { inject, Injectable } from '@angular/core';
import { LocalDomainRepositoryAbstract } from '../../shared/domain-repository/local-domain-repository-abstract';
import { CharacterGASMapper } from '../model/characters-gas.mapper';
import { CharacterRaw, CharacterRecord } from '../model/characters-model';
import { CharacterGASRepository } from './characters-gas-repository';

@Injectable({ providedIn: 'root' })
export class CharacterRepository extends LocalDomainRepositoryAbstract<CharacterRecord> {
  private readonly mapper = inject(CharacterGASMapper);
  private readonly gasRepository = inject(CharacterGASRepository);

  protected get localTable() {
    return this.localDBService.indexedDB.characters;
  }

  protected get writeGateway() {
    return this.gasRepository;
  }

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


}
