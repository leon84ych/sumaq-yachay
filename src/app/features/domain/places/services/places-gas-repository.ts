import { inject, Injectable } from '@angular/core';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { GASDomainRepositoryAbstract } from '../../../../core/infrastructure/gas/gas-domain-repository-abstract';
import { PlaceGASMapper } from '../model/places-gas.mapper';
import { PlaceRaw, PlaceRawValues, PlaceRecord } from '../model/places-model';

@Injectable({ providedIn: 'root' })
export class PlaceGASRepository extends GASDomainRepositoryAbstract<
  PlaceRecord,
  PlaceRaw,
  PlaceRawValues
> {
  override domain = 'PLACES';
  override api = inject(GASDomainAPI<PlaceRaw, PlaceRawValues>);
  override mapper = inject(PlaceGASMapper);
}
