import { Injectable } from "@angular/core";
import Dexie, { Table } from "dexie";
import { IndexRecord } from "../../../features/domain-1/index/model/index-model";
import { CatalogItem } from "../../../features/catalog/models/catalog-item.model";



const VERSION_ONE_STORES = {
  catalogs:
    'id, subject, topic, name, author, description, source, active, syncStatus, updatedAt',
  //domainSheets: 'row, count',
  //bookTags: 'id, [row+name], row, name, scope, subject, topic, book, author',
  indexes: 'id, row, book, author, *tags',
} as const;


export class IndexedDB extends Dexie {
  catalogs!: Table<CatalogItem, string>;
  indexes!: Table<IndexRecord, string>;

  constructor(databaseName = 'LocalDB') {
    super(databaseName);
    this.version(1).stores(VERSION_ONE_STORES);
  }
}

@Injectable({ providedIn: 'root' })
export class LocalDBService {

    readonly indexedDB = new IndexedDB();


    async getCatalog(): Promise<CatalogItem[]> {
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