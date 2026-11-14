import { CatalogRecord } from "../../../catalog/models/catalog-item.model";
import { IndexRecord } from "../../index/model/index-model";


//-------------------- DOMAIN SHEET RAW --------------------

export interface DomainInfo {
  id: string; // Name of the sheet tab
  index: number; // Position within the document
  count: number; // Number of rows without header
}

export interface BookInfo {
  id: CatalogRecord, 
  domains: DomainInfo[];
}

export interface DomainSheet<T> {
  row: number; // Owning Catalog entry row (local cache key, not sent to Sheets)
  id: string; // Tab name lowercased; second half of the [row+id] primary key
  name: string; // Raw tab name as returned by Apps Script (e.g. "Definitions")
  index: number; // Tab index as returned by Apps Script
  rows: T[]; // Row objects keyed by column header
}



