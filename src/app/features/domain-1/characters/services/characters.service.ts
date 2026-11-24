import { inject, Injectable } from '@angular/core';
import { BookRecord } from '../../../book/models/book-item.model';
import { BookQueryService } from '../../index/services/book-query.service';
import { CharacterRecord } from '../model/characters-model';
import { CharacterQueryService } from './characters-query.service';
import { CharacterRepository } from './characters-repository';

@Injectable({ providedIn: 'root' })
export class CharacterDataService {
  private readonly characterRepository = inject(CharacterRepository);
  private readonly bookQueryService = inject(BookQueryService);
  private readonly characterQueryService = inject(CharacterQueryService);

  async getRecords(bookId: string): Promise<CharacterRecord[]> {
    const characters = await this.characterQueryService.getCharactersByBookId(bookId);
    if (characters.length > 0) {
      return characters;
    }

    const book = await this.bookQueryService.getBookRecord(bookId);
    if (!book?.row) {
      throw new Error('Book record is missing row.');
    }
    return this.characterRepository.getDomain(book.row);
  }

  getBookRecord(bookId: string): Promise<BookRecord | undefined> {
    return this.bookQueryService.getBookRecord(bookId);
  }

  getAllowedTags(bookId: string): Promise<string[]> {
    return this.characterQueryService.getAllowedTags(bookId);
  }

  addDomainItem(record: CharacterRecord): Promise<CharacterRecord> {
    return this.characterRepository.addDomainItem(record);
  }

  updateDomainItem(record: CharacterRecord): Promise<CharacterRecord> {
    return this.characterRepository.updateDomainItem(record);
  }

  deleteDomainItem(record: CharacterRecord): Promise<void> {
    return this.characterRepository.deleteDomainItem(record);
  }
}
