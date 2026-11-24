import { inject, Injectable } from '@angular/core';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { GASDomainRepositoryAbstract } from '../../../../core/infrastructure/gas/gas-domain-repository-abstract';
import { QuestionGASMapper } from '../model/questions-gas.mapper';
import { QuestionRaw, QuestionRawValues, QuestionRecord } from '../model/questions-model';

@Injectable({ providedIn: 'root' })
export class QuestionGASRepository extends GASDomainRepositoryAbstract<
  QuestionRecord,
  QuestionRaw,
  QuestionRawValues
> {
  override domain = 'QUESTIONS';
  override api = inject(GASDomainAPI<QuestionRaw, QuestionRawValues>);
  override mapper = inject(QuestionGASMapper);
}
