import { inject, Injectable } from '@angular/core';
import { LocalDomainRepositoryAbstract } from '../../shared/domain-repository/local-domain-repository-abstract';
import { RelationGASMapper } from '../model/relations-gas.mapper';
import { RelationRaw, RelationRecord } from '../model/relations-model';
import { RelationGASRepository } from './relations-gas-repository';

@Injectable({ providedIn: 'root' })
export class RelationRepository extends LocalDomainRepositoryAbstract<RelationRecord> {
  private readonly mapper = inject(RelationGASMapper);
  private readonly gasRepository = inject(RelationGASRepository);

  protected get localTable() {
    return this.localDBService.indexedDB.relations;
  }

  protected get writeGateway() {
    return this.gasRepository;
  }

  async getDomain(bookRow: number, total: number | null = null): Promise<RelationRecord[]> {
    const snapshot = await this.snapshotForRefresh(bookRow);
    const raws: RelationRaw[] = await this.gasRepository.getDomain(bookRow, total);
    const ownerBook = snapshot.book;

    const records = raws.map((raw) => ({
      ...this.mapper.toRecord({ ...raw, bookId: raw.bookId || (ownerBook?.id ?? '') }),
      bookRow,
    }));
    const persistable = records.filter((record) => record.bookId);

    return this.mergeRemoteRecords(persistable, snapshot);
  }


}
