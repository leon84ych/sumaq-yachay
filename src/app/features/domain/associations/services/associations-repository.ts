import { inject, Injectable } from '@angular/core';
import { LocalDomainRepositoryAbstract } from '../../shared/domain-repository/local-domain-repository-abstract';
import { AssociationGASMapper } from '../model/associations-gas.mapper';
import { AssociationRaw, AssociationRecord } from '../model/associations-model';
import { AssociationGASRepository } from './associations-gas-repository';

@Injectable({ providedIn: 'root' })
export class AssociationRepository extends LocalDomainRepositoryAbstract<AssociationRecord> {
  private readonly mapper = inject(AssociationGASMapper);
  private readonly gasRepository = inject(AssociationGASRepository);

  protected get localTable() {
    return this.localDBService.indexedDB.associations;
  }

  protected get writeGateway() {
    return this.gasRepository;
  }

  async getDomain(bookRow: number, total: number | null = null): Promise<AssociationRecord[]> {
    const snapshot = await this.snapshotForRefresh(bookRow);
    const raws: AssociationRaw[] = await this.gasRepository.getDomain(bookRow, total);
    const ownerBook = snapshot.book;

    const records = raws.map((raw) => ({
      ...this.mapper.toRecord({ ...raw, bookId: raw.bookId || (ownerBook?.id ?? '') }),
      bookRow,
    }));
    const persistable = records.filter((record) => record.bookId);

    return this.mergeRemoteRecords(persistable, snapshot);
  }


}
