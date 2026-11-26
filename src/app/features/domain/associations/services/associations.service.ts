import { inject, Injectable } from '@angular/core';
import { BookRecord } from '../../../catalog/book/models/book-item.model';
import { BookQueryService } from '../../index/services/book-query.service';
import { ConceptDataService } from '../../concepts/services/concepts.service';
import { ConceptRecord } from '../../concepts/model/concepts-model';
import { AssociationRecord } from '../model/associations-model';
import { AssociationQueryService } from './associations-query.service';
import { AssociationRepository } from './associations-repository';

@Injectable({ providedIn: 'root' })
export class AssociationDataService {
  private readonly associationRepository = inject(AssociationRepository);
  private readonly associationQueryService = inject(AssociationQueryService);
  private readonly bookQueryService = inject(BookQueryService);
  private readonly conceptDataService = inject(ConceptDataService);

  async getRecords(bookId: string): Promise<AssociationRecord[]> {
    const associations = await this.associationQueryService.getAssociationsByBookId(bookId);
    if (associations.length > 0) {
      return associations;
    }

    const book = await this.bookQueryService.getBookRecord(bookId);
    if (!book?.row) {
      throw new Error('Book record is missing row.');
    }
    return this.associationRepository.getDomain(book.row);
  }

  getBookRecord(bookId: string): Promise<BookRecord | undefined> {
    return this.bookQueryService.getBookRecord(bookId);
  }

  getConcepts(bookId: string): Promise<ConceptRecord[]> {
    return this.conceptDataService.getRecords(bookId);
  }

  getAllowedTags(bookId: string): Promise<string[]> {
    return this.associationQueryService.getAllowedTags(bookId);
  }

  addDomainItem(record: AssociationRecord): Promise<AssociationRecord> {
    return this.associationRepository.addDomainItem(record);
  }

  updateDomainItem(record: AssociationRecord): Promise<AssociationRecord> {
    return this.associationRepository.updateDomainItem(record);
  }

  deleteDomainItem(record: AssociationRecord): Promise<void> {
    return this.associationRepository.deleteDomainItem(record);
  }
}
