import { inject, Injectable } from '@angular/core';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { BookEventRecord } from '../model/book-events-model';

@Injectable({ providedIn: 'root' })
export class BookEventQueryService {
  private readonly appDb = inject(LocalDBService);

  async getBookEventsByBookId(bookId: string): Promise<BookEventRecord[]> {
    return this.appDb.indexedDB.bookEvents.where('bookId').equals(bookId).toArray();
  }

  async getAllowedTags(bookId: string): Promise<string[]> {
    const tags = await this.appDb.indexedDB.tags.where('bookId').equals(bookId).toArray();
    return tags.map((tag) => tag.name);
  }
}
