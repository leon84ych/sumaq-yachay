import { DomainSheetRow, SyncStatus } from "../../shared/model/domain-shared-model";

/**
 * Specific model for domain index with GAS Google Sheets integration
 */
export interface IndexRow extends Record<string, unknown> , DomainSheetRow {
  chapter: string;
  theme: string;
  subtheme: string;
  syncStatus: SyncStatus;
}

/**
 * Specific record model for domain index
 */
export interface IndexRecord {
  id: string;
  chapter: string;
  theme: string;
  subtheme: string;
  tags: string[];
  syncStatus: SyncStatus;
  contributor: string;
}