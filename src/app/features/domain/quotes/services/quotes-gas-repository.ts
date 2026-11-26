import { inject, Injectable } from '@angular/core';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { GASDomainRepositoryAbstract } from '../../../../core/infrastructure/gas/gas-domain-repository-abstract';
import { QuoteGASMapper } from '../model/quotes-gas.mapper';
import { QuoteRaw, QuoteRawValues, QuoteRecord } from '../model/quotes-model';

@Injectable({
  providedIn: 'root',
})
export class QuoteGASRepository extends GASDomainRepositoryAbstract<
  QuoteRecord,
  QuoteRaw,
  QuoteRawValues
> {
  override domain = 'QUOTES';
  override api = inject(GASDomainAPI<QuoteRaw, QuoteRawValues>);
  override mapper = inject(QuoteGASMapper);
}
