import { inject, Injectable } from "@angular/core";
import { LocalDBService } from "../../../../shared/local-db/local-db.service";
import { BookRecord } from "../../../catalog/book/models/book-item.model";



@Injectable({
  providedIn: 'root'
})
export class BookQueryService {


  private appDb = inject(LocalDBService);

  async getBookRecord(bookId: string): Promise<BookRecord | undefined> {
    try {
      return await this.appDb.indexedDB.books
        .where('id')
        .equals(bookId)
        .first();
    } catch (error) {
      console.error(`Error retrieving book record for book with ID ${bookId}:`, error);
      throw error;
    }
  }

}