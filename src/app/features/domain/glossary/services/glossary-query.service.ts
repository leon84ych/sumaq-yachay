import { inject, Injectable } from '@angular/core';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { GlossaryRecord } from '../model/glossary-model';

@Injectable({ providedIn: 'root' })
export class GlossaryQueryService {
  private readonly localDBService = inject(LocalDBService);

  getGlossaryByBookId(bookId: string): Promise<GlossaryRecord[]> {
    return this.localDBService.indexedDB.glossary.where('bookId').equals(bookId).toArray();
  }

  async getAllowedTags(bookId: string): Promise<string[]> {
    const tags = await this.localDBService.indexedDB.tags.where('bookId').equals(bookId).toArray();
    return tags.map((tag) => tag.name);
  }
}
