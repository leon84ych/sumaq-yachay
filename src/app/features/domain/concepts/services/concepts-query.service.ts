import { inject, Injectable } from '@angular/core';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { ConceptRecord } from '../model/concepts-model';

@Injectable({
  providedIn: 'root',
})
export class ConceptQueryService {
  private readonly appDb = inject(LocalDBService);

  /** Returns all locally stored concepts of a book. */
  async getConceptsByBookId(bookId: string): Promise<ConceptRecord[]> {
    return this.appDb.indexedDB.concepts.where('bookId').equals(bookId).toArray();
  }

  /** Returns the tag names authorized for a book (built from its INDEX domain). */
  async getAllowedTags(bookId: string): Promise<string[]> {
    const tags = await this.appDb.indexedDB.tags.where('bookId').equals(bookId).toArray();
    return tags.map((tag) => tag.name);
  }
}
