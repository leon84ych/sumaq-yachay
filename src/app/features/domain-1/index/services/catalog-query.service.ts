import { inject, Injectable } from "@angular/core";
import { LocalDBService } from "../../../../shared/local-db/local-db.service";
import { CatalogRecord } from "../../../catalog/models/catalog-item.model";



@Injectable({
  providedIn: 'root'
})
export class CatalogQueryService {


  private appDb = inject(LocalDBService);

  async getCatalogRecord(bookId: string): Promise<CatalogRecord | undefined> {
    try {
      return await this.appDb.indexedDB.catalogs
        .where('id')
        .equals(bookId)
        .first();
    } catch (error) {
      console.error(`Error retrieving catalog record for book with ID ${bookId}:`, error);
      throw error;
    }
  }

}