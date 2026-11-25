import { inject, Injectable } from '@angular/core';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { PassageRecord } from '../model/passages-model';

@Injectable({
  providedIn: 'root',
})
export class PassageQueryService {
  private readonly appDb = inject(LocalDBService);

  /** Returns all locally stored passages of a book. */
  async getPassagesByBookId(bookId: string): Promise<PassageRecord[]> {
    return this.appDb.indexedDB.passages.where('bookId').equals(bookId).toArray();
  }

  /** Returns the normalized tag names authorized for a book (built from its INDEX domain). */
  async getAllowedTags(bookId: string): Promise<string[]> {
    const tags = await this.appDb.indexedDB.tags.where('bookId').equals(bookId).toArray();
    return tags.map((tag) => tag.name);
  }
}
