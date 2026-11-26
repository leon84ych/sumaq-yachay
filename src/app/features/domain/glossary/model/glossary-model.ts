import { Feed } from '../../shared/model/domain-shared-model';

export const GLOSSARY_PARTS_OF_SPEECH = [
  'Noun',
  'Adjective',
  'Verb',
  'Adverb',
  'Phrase',
  'Other',
] as const;

export type GlossaryPartOfSpeech = (typeof GLOSSARY_PARTS_OF_SPEECH)[number];

export interface GlossaryRaw {
  id: string;
  bookId: string;
  bookRow: number;
  itemRow: number;
  term: string;
  language: string;
  definition: string;
  partOfSpeech?: string;
  etymology?: string;
  synonyms?: string;
  contextSentence?: string;
  source?: string;
  page?: string | number;
  tags: string;
  feed: number;
  contributor: string;
  syncStatus: string;
}

export interface GlossaryRecord extends Feed {
  term: string;
  language: string;
  definition: string;
  partOfSpeech?: GlossaryPartOfSpeech;
  etymology?: string;
  synonyms?: string;
  contextSentence?: string;
  source?: string;
  page?: string;
  feed: number;
}

export type GlossaryRawValues = [
  string,
  number,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  string,
];

export const GLOSSARY_DEFAULT_FEED = 5;
