import { DomainSheetRow } from "../../catalog-detail/models/domain-sheet.model";

export interface QuoteRow extends DomainSheetRow {
  quote: string;
  analysis?: string;
  book: string;
  author: string;
  page?: string;
}