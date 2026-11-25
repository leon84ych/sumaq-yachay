import { inject, Injectable } from '@angular/core';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { GASDomainRepositoryAbstract } from '../../../../core/infrastructure/gas/gas-domain-repository-abstract';
import { AssociationGASMapper } from '../model/associations-gas.mapper';
import {
  AssociationRaw,
  AssociationRawValues,
  AssociationRecord,
} from '../model/associations-model';

@Injectable({ providedIn: 'root' })
export class AssociationGASRepository extends GASDomainRepositoryAbstract<
  AssociationRecord,
  AssociationRaw,
  AssociationRawValues
> {
  override domain = 'ASSOCIATIONS';
  override api = inject(GASDomainAPI<AssociationRaw, AssociationRawValues>);
  override mapper = inject(AssociationGASMapper);
}
