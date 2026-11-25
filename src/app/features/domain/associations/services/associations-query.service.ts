import { inject, Injectable } from '@angular/core';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { AssociationRecord } from '../model/associations-model';

@Injectable({ providedIn: 'root' })
export class AssociationQueryService {
  private readonly localDBService = inject(LocalDBService);

  getAssociationsByBookId(bookId: string): Promise<AssociationRecord[]> {
    return this.localDBService.indexedDB.associations.where('bookId').equals(bookId).toArray();
  }

  async getAllowedTags(bookId: string): Promise<string[]> {
    const tags = await this.localDBService.indexedDB.tags.where('bookId').equals(bookId).toArray();
    return tags.map((tag) => tag.name);
  }
}
