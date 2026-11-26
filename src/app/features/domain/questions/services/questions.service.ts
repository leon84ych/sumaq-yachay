import { inject, Injectable } from '@angular/core';
import { BookRecord } from '../../../catalog/book/models/book-item.model';
import { BookQueryService } from '../../index/services/book-query.service';
import { QuestionRecord } from '../model/questions-model';
import { QuestionQueryService } from './questions-query.service';
import { QuestionRepository } from './questions-repository';

@Injectable({ providedIn: 'root' })
export class QuestionDataService {
  private readonly questionRepository = inject(QuestionRepository);
  private readonly bookQueryService = inject(BookQueryService);
  private readonly questionQueryService = inject(QuestionQueryService);

  async getRecords(bookId: string): Promise<QuestionRecord[]> {
    const questions = await this.questionQueryService.getQuestionsByBookId(bookId);
    if (questions.length > 0) {
      return questions;
    }

    const book = await this.bookQueryService.getBookRecord(bookId);
    if (!book?.row) {
      throw new Error('Book record is missing row.');
    }
    return this.questionRepository.getDomain(book.row);
  }

  getBookRecord(bookId: string): Promise<BookRecord | undefined> {
    return this.bookQueryService.getBookRecord(bookId);
  }

  getAllowedTags(bookId: string): Promise<string[]> {
    return this.questionQueryService.getAllowedTags(bookId);
  }

  addDomainItem(record: QuestionRecord): Promise<QuestionRecord> {
    return this.questionRepository.addDomainItem(record);
  }

  updateDomainItem(record: QuestionRecord): Promise<QuestionRecord> {
    return this.questionRepository.updateDomainItem(record);
  }

  deleteDomainItem(record: QuestionRecord): Promise<void> {
    return this.questionRepository.deleteDomainItem(record);
  }
}
