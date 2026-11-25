import { inject, Injectable } from '@angular/core';
import { BookRecord } from '../../../book/models/book-item.model';
import { BookQueryService } from '../../index/services/book-query.service';
import { PlaceRecord } from '../model/places-model';
import { PlaceQueryService } from './places-query.service';
import { PlaceRepository } from './places-repository';

@Injectable({ providedIn: 'root' })
export class PlaceDataService {
  private readonly placeRepository = inject(PlaceRepository);
  private readonly bookQueryService = inject(BookQueryService);
  private readonly placeQueryService = inject(PlaceQueryService);

  async getRecords(bookId: string): Promise<PlaceRecord[]> {
    const places = await this.placeQueryService.getPlacesByBookId(bookId);
    if (places.length > 0) {
      return places;
    }

    const book = await this.bookQueryService.getBookRecord(bookId);
    if (!book?.row) {
      throw new Error('Book record is missing row.');
    }
    return this.placeRepository.getDomain(book.row);
  }

  getBookRecord(bookId: string): Promise<BookRecord | undefined> {
    return this.bookQueryService.getBookRecord(bookId);
  }

  getAllowedTags(bookId: string): Promise<string[]> {
    return this.placeQueryService.getAllowedTags(bookId);
  }

  addDomainItem(record: PlaceRecord): Promise<PlaceRecord> {
    return this.placeRepository.addDomainItem(record);
  }

  updateDomainItem(record: PlaceRecord): Promise<PlaceRecord> {
    return this.placeRepository.updateDomainItem(record);
  }

  deleteDomainItem(record: PlaceRecord): Promise<void> {
    return this.placeRepository.deleteDomainItem(record);
  }
}
