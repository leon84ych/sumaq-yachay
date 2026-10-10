import { DomainSheetRow } from "../../catalog-detail/models/domain-sheet.model";


export type PartOfSpeech =
  | 'Sustantivo'
  | 'Adjetivo'
  | 'Verbo'
  | 'Adverbio'
  | 'Locución'
  | 'Otro';

export interface GlossaryRow extends DomainSheetRow {
  term: string;
  definition: string;
  partOfSpeech?: PartOfSpeech;
  etymology?: string;
  synonyms?: string;
  contextSentence?: string;
  source?: string;
  page?: string;
}