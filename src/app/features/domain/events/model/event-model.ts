import { Feed } from '../../shared/model/domain-shared-model';

export interface BookEventRaw {
  id: string;
  bookId: string;
  bookRow: number;
  itemRow: number;
  mainCharacterId: string;
  secondaryCharacterIds: string[] | string;
  placeId?: string;
  dateTimeStart?: string;
  dateTimeEnd?: string;
  dateLabel?: string;
  eventOrder: number;
  event: string;
  description: string;
  color: string;
  book: string;
  author: string;
  page: string;
  tags: string;
  feed: number;
  contributor: string;
  syncStatus: string;
}

export interface EventRecord extends Feed {
  mainCharacterId: string;
  secondaryCharacterIds: string[];
  placeId?: string;
  dateTimeStart?: string;
  dateTimeEnd?: string;
  dateLabel?: string;
  eventOrder: number;
  event: string;
  description: string;
  color: string;
  book: string;
  author: string;
  page: string;
  feed: number;
}

export type BookEventRawValues = [
  string,
  number,
  string,
  string[],
  string,
  string,
  string,
  string,
  number,
  string,
  string,
  string,
  string,
  number,
  string,
  string,
];

export const BOOK_EVENT_DEFAULT_COLOR = '#D4A373';
export const BOOK_EVENT_DEFAULT_FEED = 5;
