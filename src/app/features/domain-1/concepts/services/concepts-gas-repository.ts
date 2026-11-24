import { inject, Injectable } from '@angular/core';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { GASDomainRepositoryAbstract } from '../../../../core/infrastructure/gas/gas-domain-repository-abstract';
import { ConceptGASMapper } from '../model/concepts-gas.mapper';
import { ConceptRaw, ConceptRawValues, ConceptRecord } from '../model/concepts-model';

@Injectable({
  providedIn: 'root',
})
export class ConceptGASRepository extends GASDomainRepositoryAbstract<
  ConceptRecord,
  ConceptRaw,
  ConceptRawValues
> {
  override domain = 'CONCEPTS';
  override api = inject(GASDomainAPI<ConceptRaw, ConceptRawValues>);
  override mapper = inject(ConceptGASMapper);

  /** UPDATE_ROW identifies the item through bookRow, itemRow and itemId inside the row object. */
  override async updateDomainItem(record: ConceptRecord): Promise<ConceptRecord> {
    const raw = this.mapper.toRaw(record);
    const row: Record<string, unknown> = { ...raw, itemId: record.id };

    await this.api.updateDomainItem(record.bookRow, record.bookId, this.domain, record.id, row);

    return this.mapper.toRecord({ ...raw, syncStatus: 'synced' });
  }
}
