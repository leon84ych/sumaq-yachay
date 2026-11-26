import { inject, Injectable } from '@angular/core';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { GASDomainRepositoryAbstract } from '../../../../core/infrastructure/gas/gas-domain-repository-abstract';
import { GlossaryGASMapper } from '../model/glossary-gas.mapper';
import { GlossaryRaw, GlossaryRawValues, GlossaryRecord } from '../model/glossary-model';

@Injectable({ providedIn: 'root' })
export class GlossaryGASRepository extends GASDomainRepositoryAbstract<
  GlossaryRecord,
  GlossaryRaw,
  GlossaryRawValues
> {
  override domain = 'GLOSARY';
  override api = inject(GASDomainAPI<GlossaryRaw, GlossaryRawValues>);
  override mapper = inject(GlossaryGASMapper);
}
