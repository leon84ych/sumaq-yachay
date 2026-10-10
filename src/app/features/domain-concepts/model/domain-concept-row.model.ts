import { DomainSheetRow } from "../../catalog-detail/models/domain-sheet.model";

export interface ConceptRow extends DomainSheetRow {
  term: string;
  definition: string;
  category?: string;
  source?: string;
}