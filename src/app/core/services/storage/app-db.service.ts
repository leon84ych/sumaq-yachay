import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { CatalogItem } from '../../../features/catalog/models/catalog-item.model';
import { DomainSheet } from '../../../features/catalog-detail/models/domain-sheet.model';

export class AppDatabase extends Dexie {
  catalogs!: Table<CatalogItem, string>;
  domainSheets!: Table<DomainSheet, [number, string]>;

  constructor() {
    super('SumaqYachayDB');
    this.version(1).stores({
      catalogs: 'id, subject, topic, name, author, description, source, active, syncStatus, updatedAt',
      domainSheets: '[row+id], row, id',
    });
  }
}

@Injectable({
  providedIn: 'root',
})
export class AppDbService {
  readonly db = new AppDatabase();
}

