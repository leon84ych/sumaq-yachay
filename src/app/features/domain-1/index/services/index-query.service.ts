import { Injectable, inject } from '@angular/core';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { IndexRecord } from '../model/index-model';
import { CatalogRecord } from '../../../catalog/models/catalog-item.model';


@Injectable({
  providedIn: 'root'
})
export class IndexQueryService {
  private appDb = inject(LocalDBService);

  /**
   * Returns all index records for a specific book using its 'bookId'
   */
  async getIndicesByBookRow(bookId: string): Promise<IndexRecord[]> {
    try {
      // Query the DB for indices with the given 'bookId'
      return await this.appDb.indexedDB.indexes
        .where('bookId')
        .equals(bookId)
        .toArray();
    } catch (error) {
      console.error(`Error retrieving indices for book with ID ${bookId}:`, error);
      throw error;
    }
  }


}