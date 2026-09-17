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
    // v2/v3: existing browsers created the v1 store before the standalone `row` index existed.
    // Declaring the identical schema again is a no-op for Dexie, so the store must be dropped (v2)
    // and recreated (v3) to force IndexedDB to actually rebuild it with the `row` index.
    this.version(2).stores({
      domainSheets: null,
    });
    this.version(3).stores({
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

