import { inject, Injectable } from '@angular/core';
import { BookRecord } from '../../../catalog/book/models/book-item.model';
import { BookQueryService } from '../../index/services/book-query.service';
import { QuoteRecord } from '../model/quotes-model';
import { QuoteQueryService } from './quotes-query.service';
import { QuoteRepository } from './quotes-repository';

@Injectable({
  providedIn: 'root',
})
export class QuoteDataService {
  private readonly quoteRepository = inject(QuoteRepository);
  private readonly bookQueryService = inject(BookQueryService);
  private readonly quoteQueryService = inject(QuoteQueryService);

  /** Returns locally stored quotes for a book, or fetches them from GAS when none are stored. */
  async getRecords(bookId: string): Promise<QuoteRecord[]> {
    const quotes = await this.quoteQueryService.getQuotesByBookId(bookId);
    if (quotes.length > 0) {
      return quotes;
    }

    const book = await this.bookQueryService.getBookRecord(bookId);
    if (!book?.row) {
      throw new Error('Book record is missing row.');
    }
    return this.quoteRepository.getDomain(book.row);
  }

  getBookRecord(bookId: string): Promise<BookRecord | undefined> {
    return this.bookQueryService.getBookRecord(bookId);
  }

  getAllowedTags(bookId: string): Promise<string[]> {
    return this.quoteQueryService.getAllowedTags(bookId);
  }

  addDomainItem(record: QuoteRecord): Promise<QuoteRecord> {
    return this.quoteRepository.addDomainItem(record);
  }

  updateDomainItem(record: QuoteRecord): Promise<QuoteRecord> {
    return this.quoteRepository.updateDomainItem(record);
  }

  deleteDomainItem(record: QuoteRecord): Promise<void> {
    return this.quoteRepository.deleteDomainItem(record);
  }
}
