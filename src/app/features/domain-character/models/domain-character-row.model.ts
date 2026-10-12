import { DomainSheetRow } from "../../catalog-detail/models/domain-sheet.model";

export type CharacterRole = 'protagonist' | 'antagonist' | 'supporting' | 'historical' | 'mythical';

export type CharacterNature = 'historical' | 'fictitious' | 'inspired';

export interface CharacterRow extends DomainSheetRow {
  name: string;
  role: CharacterRole;
  nature?: CharacterNature;
  description?: string;
  archetype?: string;
  color?: string;
  source?: string;
}