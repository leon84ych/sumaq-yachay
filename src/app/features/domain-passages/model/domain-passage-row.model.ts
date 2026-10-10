import { DomainSheetRow } from "../../catalog-detail/models/domain-sheet.model";

export interface PassagesRow extends DomainSheetRow {
  title: string;
  passageText: string;
  book: string;
  author: string;
  page?: string;
}