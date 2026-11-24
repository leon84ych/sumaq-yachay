import { inject, Injectable } from '@angular/core';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { PlaceRecord } from '../model/places-model';

@Injectable({ providedIn: 'root' })
export class PlaceQueryService {
  private readonly localDBService = inject(LocalDBService);

  getPlacesByBookId(bookId: string): Promise<PlaceRecord[]> {
    return this.localDBService.indexedDB.places.where('bookId').equals(bookId).toArray();
  }

  async getAllowedTags(bookId: string): Promise<string[]> {
    const tags = await this.localDBService.indexedDB.tags.where('bookId').equals(bookId).toArray();
    return tags.map((tag) => tag.name);
  }
}
