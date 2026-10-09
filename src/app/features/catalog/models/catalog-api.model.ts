import { CatalogItem } from './catalog-item.model';

export interface GetCatalogResponse {
  status: 'success' | 'error';
  timestamp: string;
  data: CatalogItem[];
  message?: string;
}

export type CatalogRowValues = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  boolean,
  string,
  number,
  string,
];

export interface CatalogPostPayload {
  action: 'CREATE_CATALOG_ITEM' | 'UPDATE_CATALOG_ITEM';
  id: string;
  row: number;
  rowValues: CatalogRowValues;
}

export interface CatalogPostResponse {
  status: 'success' | 'error';
  id?: string;
  message?: string;
}
