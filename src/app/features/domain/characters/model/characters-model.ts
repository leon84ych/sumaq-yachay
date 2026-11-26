import { Feed } from '../../shared/model/domain-shared-model';

export const CHARACTER_ROLES = [
  'protagonist',
  'antagonist',
  'supporting',
  'historical',
  'mythical',
] as const;

export const CHARACTER_NATURES = ['historical', 'fictitious', 'inspired'] as const;

export type CharacterRole = (typeof CHARACTER_ROLES)[number];
export type CharacterNature = (typeof CHARACTER_NATURES)[number];

export interface CharacterRaw {
  id: string;
  bookId: string;
  bookRow: number;
  itemRow: number;
  name: string;
  role: CharacterRole;
  nature?: CharacterNature;
  description?: string;
  archetype?: string;
  color?: string;
  source?: string;
  tags: string;
  feed: number;
  contributor: string;
  syncStatus: string;
}

export interface CharacterRecord extends Feed {
  name: string;
  role: CharacterRole;
  nature?: CharacterNature;
  description?: string;
  archetype?: string;
  color?: string;
  source?: string;
  feed: number;
}

export type CharacterRawValues = [
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
  number,
  string,
  string,
];

export const CHARACTER_DEFAULT_FEED = 5;
