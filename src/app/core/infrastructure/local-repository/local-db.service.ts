import { Injectable } from "@angular/core";
import Dexie, { Table } from "dexie";
import { CatalogRecord } from "../../../features/domain-2/catalog-1/models/catalog-item.model";
import { IndexRecord } from "../../../features/domain-2/index/model/index-model";



const VERSION_ONE_STORES = {
  catalogs:
    'id, subject, topic, name, author, description, source, active, syncStatus, updatedAt',
  //domainSheets: 'row, count',
  //bookTags: 'id, [row+name], row, name, scope, subject, topic, book, author',
  indexes: 'id, row, book, author, *tags',
} as const;


export class IndexedDB extends Dexie {
  catalogs!: Table<CatalogRecord, string>;
  indexes!: Table<IndexRecord, string>;

  constructor(databaseName = 'LocalDB') {
    super(databaseName);
    this.version(1).stores(VERSION_ONE_STORES);
  }
}

@Injectable({ providedIn: 'root' })
export class LocalDBService {

    readonly indexedDB = new IndexedDB();


    async getCatalog(): Promise<CatalogRecord[]> {
        return this.indexedDB.catalogs.toArray();
    }
    
    
    
    
    
    async clearAllTables(): Promise<void> {
    const tables = this.indexedDB.tables;
    await this.indexedDB.transaction('rw', tables, async () => {
      for (const table of tables) {
        await table.clear();
      }
    });
  }


}