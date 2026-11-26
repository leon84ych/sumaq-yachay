import { Feed } from '../../shared/model/domain-shared-model';

/**
 * Raw representation of a quote as returned by the GAS backend
 */
export interface QuoteRaw {
  id: string;
  bookId: string;
  bookRow: number;
  itemRow: number;
  quote: string;
  analysis: string;
  book: string;
  author: string;
  page: string | number;
  tags: string;
  syncStatus: string;
  contributor: string;
  feed: number;
}

/**
 * Specific record model for domain quotes
 */
export interface QuoteRecord extends Feed {
  quote: string;
  analysis: string;
  book: string;
  author: string;
  page: string;
  feed: number;
}

export type QuoteRawValues = [
  string, //id
  number, //itemRow
  string, //quote
  string, //analysis
  string, //book
  string, //author
  string, //page
  string, //tags
  number, //feed
  string, //contributor
  string, //syncStatus
];

export const QUOTE_DEFAULT_FEED = 5;
