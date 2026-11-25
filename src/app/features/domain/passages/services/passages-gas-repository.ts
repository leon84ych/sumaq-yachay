import { inject, Injectable } from '@angular/core';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { GASDomainRepositoryAbstract } from '../../../../core/infrastructure/gas/gas-domain-repository-abstract';
import { PassageGASMapper } from '../model/passages-gas.mapper';
import { PassageRaw, PassageRawValues, PassageRecord } from '../model/passages-model';

@Injectable({
  providedIn: 'root',
})
export class PassageGASRepository extends GASDomainRepositoryAbstract<
  PassageRecord,
  PassageRaw,
  PassageRawValues
> {
  override domain = 'PASSAGES';
  override api = inject(GASDomainAPI<PassageRaw, PassageRawValues>);
  override mapper = inject(PassageGASMapper);
}
