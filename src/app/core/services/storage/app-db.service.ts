import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { CatalogItem } from '../../../features/catalog/models/catalog-item.model';

export class AppDatabase extends Dexie {
  catalogs!: Table<CatalogItem, string>;

  constructor() {
    super('SumaqYachayDB');
    this.version(1).stores({
      catalogs: 'id, subject, topic, name, author, description, source, active, syncStatus, updatedAt',
    });
  }
}

@Injectable({
  providedIn: 'root',
})
export class AppDbService {
  readonly db = new AppDatabase();
}
