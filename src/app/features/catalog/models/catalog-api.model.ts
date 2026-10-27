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

export type CatalogCopyOption = 'CLONE' | 'SHARED';

export interface CopyCatalogPayload {
  action: 'COPY_CATALOG';
  SheetId: string;
  option: CatalogCopyOption;
}

export interface CatalogPostResponse {
  status: 'success' | 'error';
  id?: string;
  message?: string;
}
