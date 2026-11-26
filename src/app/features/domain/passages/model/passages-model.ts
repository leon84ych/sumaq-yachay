import { Feed } from '../../shared/model/domain-shared-model';

/**
 * Raw representation of a passage as returned by the GAS backend
 */
export interface PassageRaw {
  id: string;
  bookId: string;
  bookRow: number;
  itemRow: number;
  title: string;
  passageText: string;
  book: string;
  author: string;
  page: string | number;
  tags: string;
  syncStatus: string;
  contributor: string;
  feed: number;
}

/**
 * Specific record model for domain passages
 */
export interface PassageRecord extends Feed {
  title: string;
  passageText: string;
  book: string;
  author: string;
  page: string;
  feed: number;
}

export type PassageRawValues = [
  string, //id
  number, //itemRow
  string, //title
  string, //passageText
  string, //book
  string, //author
  string, //page
  string, //tags
  number, //feed
  string, //contributor
  string, //syncStatus
];

export const PASSAGE_DEFAULT_FEED = 5;
export const PASSAGE_TEXT_MAX_LENGTH = 2000;
