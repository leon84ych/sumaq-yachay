import { inject, Injectable } from '@angular/core';
import { BookRecord } from '../../../book/models/book-item.model';
import { BookQueryService } from '../../index/services/book-query.service';
import { ConceptRecord } from '../model/concepts-model';
import { ConceptQueryService } from './concepts-query.service';
import { ConceptRepository } from './concepts-repository';

@Injectable({
  providedIn: 'root',
})
export class ConceptDataService {
  private readonly conceptRepository = inject(ConceptRepository);
  private readonly bookQueryService = inject(BookQueryService);
  private readonly conceptQueryService = inject(ConceptQueryService);

  /** Returns locally stored concepts for a book, or fetches them from GAS when none are stored. */
  async getRecords(bookId: string): Promise<ConceptRecord[]> {
    const concepts = await this.conceptQueryService.getConceptsByBookId(bookId);
    if (concepts.length > 0) {
      return concepts;
    }

    const book = await this.bookQueryService.getBookRecord(bookId);
    if (!book?.row) {
      throw new Error('Book record is missing row.');
    }
    return this.conceptRepository.getDomain(book.row);
  }

  getBookRecord(bookId: string): Promise<BookRecord | undefined> {
    return this.bookQueryService.getBookRecord(bookId);
  }

  getAllowedTags(bookId: string): Promise<string[]> {
    return this.conceptQueryService.getAllowedTags(bookId);
  }

  addDomainItem(record: ConceptRecord): Promise<ConceptRecord> {
    return this.conceptRepository.addDomainItem(record);
  }

  updateDomainItem(record: ConceptRecord): Promise<ConceptRecord> {
    return this.conceptRepository.updateDomainItem(record);
  }

  deleteDomainItem(record: ConceptRecord): Promise<void> {
    return this.conceptRepository.deleteDomainItem(record);
  }
}
