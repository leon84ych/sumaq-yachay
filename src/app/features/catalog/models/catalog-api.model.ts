import { CatalogItem } from './catalog-item.model';

export interface GetCatalogResponse {
  status: 'success' | 'error';
  timestamp: string;
  data: CatalogItem[];
  message?: string;
}

export interface CatalogPostPayload {
  action: 'CREATE_CATALOG_ITEM' | 'UPDATE_CATALOG_ITEM';
  sheetName: 'MasterIndex';
  id: string;
  rowValues: [
    string,   // [0] ID / UUID
    string,   // [1] SheetID
    string,   // [2] Name
    string,   // [3] Category
    string,   // [4] Type
    boolean,  // [5] Active (TRUE / FALSE)
    string    // [6] UpdatedAt ISO String
  ];
}

export interface CatalogPostResponse {
  status: 'success' | 'error';
  id?: string;
  message?: string;
}
