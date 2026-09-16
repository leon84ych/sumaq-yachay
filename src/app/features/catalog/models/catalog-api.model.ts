import { CatalogItem } from './catalog-item.model';

export interface GetCatalogResponse {
  status: 'success' | 'error';
  timestamp: string;
  data: CatalogItem[];
  message?: string;
}

export interface CatalogPostPayload {
  action: 'CREATE_CATALOG_ITEM' | 'UPDATE_CATALOG_ITEM';
  id: string;
  row: number;  // Row number in Master Index (1-based, for display only)
  rowValues: [
    string,   // [0] ID / UUID
    string,   // [1] Subject
    string,   // [2] Topic
    string,   // [3] Name
    string,   // [4] Author
    string,   // [5] Description
    string,   // [6] Source
    boolean  // [7] Active (TRUE / FALSE)
  ];
}

export interface CatalogPostResponse {
  status: 'success' | 'error';
  id?: string;
  message?: string;
}
