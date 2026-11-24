import { inject, Injectable } from '@angular/core';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { GASDomainRepositoryAbstract } from '../../../../core/infrastructure/gas/gas-domain-repository-abstract';
import { RelationGASMapper } from '../model/relations-gas.mapper';
import { RelationRaw, RelationRawValues, RelationRecord } from '../model/relations-model';

@Injectable({ providedIn: 'root' })
export class RelationGASRepository extends GASDomainRepositoryAbstract<
  RelationRecord,
  RelationRaw,
  RelationRawValues
> {
  override domain = 'RELATIONS';
  override api = inject(GASDomainAPI<RelationRaw, RelationRawValues>);
  override mapper = inject(RelationGASMapper);
}
