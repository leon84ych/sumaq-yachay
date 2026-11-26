import { inject, Injectable } from '@angular/core';
import { BookRecord } from '../../../catalog/book/models/book-item.model';
import { BookQueryService } from '../../index/services/book-query.service';
import { CharacterDataService } from '../../characters/services/characters.service';
import { CharacterRecord } from '../../characters/model/characters-model';
import { PlaceDataService } from '../../places/services/places.service';
import { PlaceRecord } from '../../places/model/places-model';
import { EventRecord } from '../model/event-model';
import { BookEventQueryService } from './book-events-query.service';
import { BookEventRepository } from './book-events-repository';

@Injectable({ providedIn: 'root' })
export class BookEventDataService {
  private readonly repository = inject(BookEventRepository);
  private readonly bookQueryService = inject(BookQueryService);
  private readonly queryService = inject(BookEventQueryService);
  private readonly characterDataService = inject(CharacterDataService);
  private readonly placeDataService = inject(PlaceDataService);

  async getRecords(bookId: string): Promise<EventRecord[]> {
    const records = await this.queryService.getBookEventsByBookId(bookId);
    if (records.length > 0) {
      return records;
    }

    const book = await this.bookQueryService.getBookRecord(bookId);
    if (!book?.row) {
      throw new Error('Book record is missing row.');
    }
    return this.repository.getDomain(book.row);
  }

  getBookRecord(bookId: string): Promise<BookRecord | undefined> {
    return this.bookQueryService.getBookRecord(bookId);
  }

  getCharacters(bookId: string): Promise<CharacterRecord[]> {
    return this.characterDataService.getRecords(bookId);
  }

  getPlaces(bookId: string): Promise<PlaceRecord[]> {
    return this.placeDataService.getRecords(bookId);
  }

  getAllowedTags(bookId: string): Promise<string[]> {
    return this.queryService.getAllowedTags(bookId);
  }

  addDomainItem(record: EventRecord): Promise<EventRecord> {
    return this.repository.addDomainItem(record);
  }

  updateDomainItem(record: EventRecord): Promise<EventRecord> {
    return this.repository.updateDomainItem(record);
  }

  deleteDomainItem(record: EventRecord): Promise<void> {
    return this.repository.deleteDomainItem(record);
  }
}
