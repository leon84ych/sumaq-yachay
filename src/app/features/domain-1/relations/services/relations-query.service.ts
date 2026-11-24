import { inject, Injectable } from '@angular/core';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { RelationRecord } from '../model/relations-model';

@Injectable({ providedIn: 'root' })
export class RelationQueryService {
  private readonly localDBService = inject(LocalDBService);

  getRelationsByBookId(bookId: string): Promise<RelationRecord[]> {
    return this.localDBService.indexedDB.relations.where('bookId').equals(bookId).toArray();
  }

  async getAllowedTags(bookId: string): Promise<string[]> {
    const tags = await this.localDBService.indexedDB.tags.where('bookId').equals(bookId).toArray();
    return tags.map((tag) => tag.name);
  }
}
