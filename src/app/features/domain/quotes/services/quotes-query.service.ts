import { inject, Injectable } from '@angular/core';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { QuoteRecord } from '../model/quotes-model';

@Injectable({
  providedIn: 'root',
})
export class QuoteQueryService {
  private readonly appDb = inject(LocalDBService);

  /** Returns all locally stored quotes of a book. */
  async getQuotesByBookId(bookId: string): Promise<QuoteRecord[]> {
    return this.appDb.indexedDB.quotes.where('bookId').equals(bookId).toArray();
  }

  /** Returns the normalized tag names authorized for a book (built from its INDEX domain). */
  async getAllowedTags(bookId: string): Promise<string[]> {
    const tags = await this.appDb.indexedDB.tags.where('bookId').equals(bookId).toArray();
    return tags.map((tag) => tag.name);
  }
}
