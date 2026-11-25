import { inject, Injectable } from '@angular/core';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { CharacterRecord } from '../model/characters-model';

@Injectable({ providedIn: 'root' })
export class CharacterQueryService {
  private readonly localDBService = inject(LocalDBService);

  getCharactersByBookId(bookId: string): Promise<CharacterRecord[]> {
    return this.localDBService.indexedDB.characters.where('bookId').equals(bookId).toArray();
  }

  async getAllowedTags(bookId: string): Promise<string[]> {
    const tags = await this.localDBService.indexedDB.tags.where('bookId').equals(bookId).toArray();
    return tags.map((tag) => tag.name);
  }
}
