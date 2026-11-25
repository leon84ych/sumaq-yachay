import { inject, Injectable } from '@angular/core';
import { BookRecord } from '../../../book/models/book-item.model';
import { BookQueryService } from '../../index/services/book-query.service';
import { CharacterDataService } from '../../characters/services/characters.service';
import { CharacterRecord } from '../../characters/model/characters-model';
import { RelationRecord } from '../model/relations-model';
import { RelationQueryService } from './relations-query.service';
import { RelationRepository } from './relations-repository';

@Injectable({ providedIn: 'root' })
export class RelationDataService {
  private readonly relationRepository = inject(RelationRepository);
  private readonly relationQueryService = inject(RelationQueryService);
  private readonly bookQueryService = inject(BookQueryService);
  private readonly characterDataService = inject(CharacterDataService);

  async getRecords(bookId: string): Promise<RelationRecord[]> {
    const relations = await this.relationQueryService.getRelationsByBookId(bookId);
    if (relations.length > 0) {
      return relations;
    }

    const book = await this.bookQueryService.getBookRecord(bookId);
    if (!book?.row) {
      throw new Error('Book record is missing row.');
    }
    return this.relationRepository.getDomain(book.row);
  }

  getBookRecord(bookId: string): Promise<BookRecord | undefined> {
    return this.bookQueryService.getBookRecord(bookId);
  }

  getCharacters(bookId: string): Promise<CharacterRecord[]> {
    return this.characterDataService.getRecords(bookId);
  }

  getAllowedTags(bookId: string): Promise<string[]> {
    return this.relationQueryService.getAllowedTags(bookId);
  }

  addDomainItem(record: RelationRecord): Promise<RelationRecord> {
    return this.relationRepository.addDomainItem(record);
  }

  updateDomainItem(record: RelationRecord): Promise<RelationRecord> {
    return this.relationRepository.updateDomainItem(record);
  }

  deleteDomainItem(record: RelationRecord): Promise<void> {
    return this.relationRepository.deleteDomainItem(record);
  }
}
