import { inject, Injectable } from '@angular/core';
import { BookRecord } from '../../../catalog/book/models/book-item.model';
import { BookQueryService } from '../../index/services/book-query.service';
import { GlossaryRecord } from '../model/glossary-model';
import { GlossaryQueryService } from './glossary-query.service';
import { GlossaryRepository } from './glossary-repository';
import { LanguageService } from '../../../../shared/language/language.service';

@Injectable({ providedIn: 'root' })
export class GlossaryDataService {
  private readonly glossaryRepository = inject(GlossaryRepository);
  private readonly bookQueryService = inject(BookQueryService);
  private readonly glossaryQueryService = inject(GlossaryQueryService);
  private readonly languageService = inject(LanguageService);

  async getRecords(bookId: string): Promise<GlossaryRecord[]> {
    const entries = await this.glossaryQueryService.getGlossaryByBookId(bookId);
    if (entries.length > 0) {
      return entries;
    }

    const book = await this.bookQueryService.getBookRecord(bookId);
    if (!book?.row) {
      throw new Error('Book record is missing row.');
    }
    return this.glossaryRepository.getDomain(book.row);
  }

  getBookRecord(bookId: string): Promise<BookRecord | undefined> {
    return this.bookQueryService.getBookRecord(bookId);
  }

  getAllowedTags(bookId: string): Promise<string[]> {
    return this.glossaryQueryService.getAllowedTags(bookId);
  }

  async addDomainItem(record: GlossaryRecord): Promise<GlossaryRecord> {
    const saved = await this.glossaryRepository.addDomainItem(record);
    await this.languageService.remember(saved.language);
    return saved;
  }

  async updateDomainItem(record: GlossaryRecord): Promise<GlossaryRecord> {
    const saved = await this.glossaryRepository.updateDomainItem(record);
    await this.languageService.remember(saved.language);
    return saved;
  }

  deleteDomainItem(record: GlossaryRecord): Promise<void> {
    return this.glossaryRepository.deleteDomainItem(record);
  }
}
