import { CatalogItem } from './catalog-item.model';

export interface GetCatalogResponse {
  status: 'success' | 'error';
  timestamp: string;
  email?: string;
  role?: string;
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

export interface CopyCatalogPayload {
  action: 'CLONE_CATALOG';
  SheetId: string;
}

export interface CloneCatalogItemPayload {
  action: 'CLONE_CATALOG_ITEM';
  SheetId: string;
}

export interface CatalogPostResponse {
  status: 'success' | 'error';
  id?: string;
  message?: string;
}
