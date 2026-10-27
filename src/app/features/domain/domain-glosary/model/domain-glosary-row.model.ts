import { DomainSheetRow } from "../../../catalog-detail/models/domain-sheet.model";


export type PartOfSpeech =
  | 'Noun'
  | 'Adjective'
  | 'Verb'
  | 'Adverb'
  | 'Phrase'
  | 'Other';

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

export interface GlossaryEntryRecord {
  id: string;
  row: number;
  book?: string;
  author?: string;
  term: string;
  definition: string;
  partOfSpeech?: string;
  etymology?: string;
  synonyms?: string;
  contextSentence?: string;
  page?: string;
  tags: string[];
  feed: number;
  contributor: string;
  syncStatus: 'pending' | 'synced' | 'error';
}