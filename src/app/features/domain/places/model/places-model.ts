import { Feed } from '../../shared/model/domain-shared-model';

export const PLACE_TYPES = ['city', 'country', 'building', 'region', 'institution'] as const;
export const PLACE_NATURES = ['real', 'fictional', 'inspired'] as const;

export type PlaceType = (typeof PLACE_TYPES)[number];
export type PlaceNature = (typeof PLACE_NATURES)[number];

export interface PlaceRaw {
  id: string;
  bookId: string;
  bookRow: number;
  itemRow: number;
  name: string;
  type: PlaceType;
  nature: PlaceNature;
  coordinates?: string;
  color: string;
  description?: string;
  source?: string;
  tags: string;
  feed: number;
  contributor: string;
  syncStatus: string;
}

export interface PlaceRecord extends Feed {
  name: string;
  type: PlaceType;
  nature: PlaceNature;
  coordinates?: string;
  color: string;
  description?: string;
  source?: string;
  feed: number;
}

export type PlaceRawValues = [
  string,
  number,
  string,
  PlaceType,
  PlaceNature,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  string,
];

export const PLACE_DEFAULT_FEED = 5;
export const PLACE_DEFAULT_COLOR = '#3b82f6';
