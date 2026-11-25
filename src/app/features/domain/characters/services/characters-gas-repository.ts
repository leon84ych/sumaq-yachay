import { inject, Injectable } from '@angular/core';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { GASDomainRepositoryAbstract } from '../../../../core/infrastructure/gas/gas-domain-repository-abstract';
import { CharacterGASMapper } from '../model/characters-gas.mapper';
import { CharacterRaw, CharacterRawValues, CharacterRecord } from '../model/characters-model';

@Injectable({ providedIn: 'root' })
export class CharacterGASRepository extends GASDomainRepositoryAbstract<
  CharacterRecord,
  CharacterRaw,
  CharacterRawValues
> {
  override domain = 'CHARACTER';
  override api = inject(GASDomainAPI<CharacterRaw, CharacterRawValues>);
  override mapper = inject(CharacterGASMapper);
}
