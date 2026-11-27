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
    const snapshot = await this.snapshotForRefresh(bookRow);
    const raws: GlossaryRaw[] = await this.gasRepository.getDomain(bookRow, total);
    const ownerBook = snapshot.book;

    const records = raws.map((raw) => ({
      ...this.mapper.toRecord({ ...raw, bookId: raw.bookId || (ownerBook?.id ?? '') }),
      bookRow,
    }));
    const persistable = records.filter((record) => record.bookId);

    return this.mergeRemoteRecords(persistable, snapshot);
  }


}
