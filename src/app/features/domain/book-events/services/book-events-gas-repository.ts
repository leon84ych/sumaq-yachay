import { inject, Injectable } from '@angular/core';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { GASDomainRepositoryAbstract } from '../../../../core/infrastructure/gas/gas-domain-repository-abstract';
import { BookEventGASMapper } from '../model/book-events-gas.mapper';
import {
  BookEventRaw,
  BookEventRawValues,
  BookEventRecord,
} from '../model/book-events-model';

@Injectable({ providedIn: 'root' })
export class BookEventGASRepository extends GASDomainRepositoryAbstract<
  BookEventRecord,
  BookEventRaw,
  BookEventRawValues
> {
  override domain = 'BOOK_EVENTS';
  override api = inject(GASDomainAPI<BookEventRaw, BookEventRawValues>);
  override mapper = inject(BookEventGASMapper);
}
