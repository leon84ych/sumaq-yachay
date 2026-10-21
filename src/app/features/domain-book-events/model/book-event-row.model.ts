import { SyncState } from '../../catalog/models/catalog-item.model';
import { DomainSheetRow } from '../../catalog-detail/models/domain-sheet.model';

export interface BookEvent extends DomainSheetRow {
  id: string;
  row: number;
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
  tags: string[];
  syncStatus: SyncState;
}

export type BookEventRecord = Omit<BookEvent, 'row'> & {
  row: number;
  displayRow: number;
  tags: string[];
};