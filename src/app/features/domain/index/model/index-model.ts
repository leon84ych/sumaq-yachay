import { Domain } from "../../shared/model/domain-shared-model";



/**
 * Raw representation of an index entry as returned by the GAS backend
 */
export interface IndexRaw {
  id: string;
  bookId: string;
  bookRow: number;
  itemRow: number;
  chapter: string;
  theme: string;
  subtheme: string;
  tags: string;
  syncStatus: string;
  contributor: string;
  feed: number;
}


/**
 * Specific record model for domain index
 */
export interface IndexRecord extends Domain {
  chapter: string;
  theme: string;
  subtheme: string;
  feed: number;
}


export type IndexRawValues = [
  string,   //id
  number,   //itemRow
  string,   //chapter
  string,   //theme
  string,   //subtheme
  string,   //tags
  number,   //feed
  string,   //contributor
  string,   //syncStatus
];