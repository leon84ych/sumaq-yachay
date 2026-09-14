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
    string,   // [2] Subject
    string,   // [3] Topic
    string,   // [4] Name
    string,   // [5] Author
    string,   // [6] Description
    string,   // [7] Source
    boolean  // [8] Active (TRUE / FALSE)
  ];
}

export interface CatalogPostResponse {
  status: 'success' | 'error';
  id?: string;
  message?: string;
}
