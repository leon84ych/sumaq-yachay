import { DomainSheet } from "../../shared/model/domain-shared-model";



/**
 * Raw representation of an index entry as returned by the GAS backend
 */
export interface IndexRaw {
  id: string;
  row: number;
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
export interface IndexRecord extends DomainSheet {
  chapter: string;
  theme: string;
  subtheme: string;
  feed: number;
}


export type IndexRawValues = [
  string,   //id
  string,   //chapter
  string,   //theme
  string,   //subtheme
  string,   //tags
  number,   //feed
  string,   //contributor
  string,   //syncStatus
];