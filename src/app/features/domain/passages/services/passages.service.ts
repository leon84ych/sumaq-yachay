import { inject, Injectable } from '@angular/core';
import { BookRecord } from '../../../catalog/book/models/book-item.model';
import { BookQueryService } from '../../index/services/book-query.service';
import { PassageRecord } from '../model/passages-model';
import { PassageQueryService } from './passages-query.service';
import { PassageRepository } from './passages-repository';

@Injectable({
  providedIn: 'root',
})
export class PassageDataService {
  private readonly passageRepository = inject(PassageRepository);
  private readonly bookQueryService = inject(BookQueryService);
  private readonly passageQueryService = inject(PassageQueryService);

  /** Returns locally stored passages for a book, or fetches them from GAS when none are stored. */
  async getRecords(bookId: string): Promise<PassageRecord[]> {
    const passages = await this.passageQueryService.getPassagesByBookId(bookId);
    if (passages.length > 0) {
      return passages;
    }

    const book = await this.bookQueryService.getBookRecord(bookId);
    if (!book?.row) {
      throw new Error('Book record is missing row.');
    }
    return this.passageRepository.getDomain(book.row);
  }

  getBookRecord(bookId: string): Promise<BookRecord | undefined> {
    return this.bookQueryService.getBookRecord(bookId);
  }

  getAllowedTags(bookId: string): Promise<string[]> {
    return this.passageQueryService.getAllowedTags(bookId);
  }

  addDomainItem(record: PassageRecord): Promise<PassageRecord> {
    return this.passageRepository.addDomainItem(record);
  }

  updateDomainItem(record: PassageRecord): Promise<PassageRecord> {
    return this.passageRepository.updateDomainItem(record);
  }

  deleteDomainItem(record: PassageRecord): Promise<void> {
    return this.passageRepository.deleteDomainItem(record);
  }
}
