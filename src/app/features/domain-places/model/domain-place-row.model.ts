import { DomainSheetRow } from "../../catalog-detail/models/domain-sheet.model";

export interface PlaceRow extends DomainSheetRow {
  name: string;
  type: 'city' | 'country' | 'building' | 'region' | 'institution';
  nature: 'real' | 'fictional' | 'inspired';
  coordinates?: string;
  color: string;
  description?: string;
  source?: string;
}