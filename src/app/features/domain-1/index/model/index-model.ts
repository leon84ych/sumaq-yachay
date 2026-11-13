import { DomainSheet } from "../../shared/model/domain-shared-model";


/**
 * Specific record model for domain index
 */
export interface IndexRecord extends DomainSheet {
  chapter: string;
  theme: string;
  subtheme: string;
  feed: number;
}

