import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { CatalogItem } from '../../../features/catalog/models/catalog-item.model';

export interface DomainSheetCount {
  row: number;
  count: number;
}

export interface BookTag {
  id: string;
  scope?: 'book' | 'catalog';
  row?: number;
  book?: string;
  author?: string;
  subject?: string;
  topic?: string;
  tag: string;
  domain?: string;
  usageCount?: number;
}

export interface IndexTopic {
  id: string;
  row: number;
  book?: string;
  author?: string;
  tag: string;
  chapter: string;
  theme: string;
  subtheme: string;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface Concept {
  id: string;
  row: number;
  book?: string;
  author?: string;
  tag: string;
  term: string;
  definition: string;
  category: string;
  source: string;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface Quote {
  id: string;
  row: number;
  book?: string;
  author: string;
  tag: string;
  quote: string;
  analysis: string;
  page: string;
  tags: string;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface Passage {
  id: string;
  row: number;
  book: string;
  author: string;
  tag: string;
  title: string;
  passageText: string;
  page: string;
  tags: string;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface Character {
  id: string;
  row: number;
  book?: string;
  author?: string;
  tag: string;
  name: string;
  role: string;
  description?: string;
  archetype?: string;
  source?: string;
  tags?: string;
  feed: number;
  contributor: string;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface Place {
  id: string;
  row: number;
  book?: string;
  author?: string;
  tag: string;
  name: string;
  type: 'city' | 'country' | 'building' | 'region' | 'institution';
  nature: 'real' | 'fictional' | 'inspired';
  coordinates?: string;
  color: string;
  description?: string;
  source?: string;
  tags?: string;
  feed: number;
  contributor: string;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface TimelineEntry {
  id: string;
  row: number;
  book?: string;
  author?: string;
  tag: string;
  date: string;
  event: string;
  description: string;
  significance: string;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface Relation {
  id: string;
  row: number;
  book?: string;
  author?: string;
  tag: string;
  sourceNode: string;
  targetNode: string;
  relationshipType: string;
  weight: string;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface GlossaryEntry {
  id: string;
  row: number;
  book?: string;
  author?: string;
  term: string;
  definition: string;
  partOfSpeech?: string;
  etymology?: string;
  synonyms?: string;
  contextSentence?: string;
  page?: string;
  tags?: string;
  feed: number;
  contributor: string;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface Question {
  id: string;
  row: number;
  book?: string;
  author?: string;
  tag: string;
  question: string;
  answer: string;
  difficulty: string;
  status: string;
  syncStatus: 'pending' | 'synced' | 'error';
}

export class AppDatabase extends Dexie {
  catalogs!: Table<CatalogItem, string>;
  domainSheets!: Table<DomainSheetCount, number>;
  bookTags!: Table<BookTag, string>;
  indexTopics!: Table<IndexTopic, string>;
  concepts!: Table<Concept, string>;
  quotes!: Table<Quote, string>;
  passages!: Table<Passage, string>;
  characters!: Table<Character, string>;
  places!: Table<Place, string>;
  timeline!: Table<TimelineEntry, string>;
  relations!: Table<Relation, string>;
  glosary!: Table<GlossaryEntry, string>;
  questions!: Table<Question, string>;

  constructor() {
    super('SumaqYachayDB');
    this.version(1).stores({
      catalogs:
        'id, subject, topic, name, author, description, source, active, syncStatus, updatedAt',
      domainSheets: 'row, count',
      bookTags: 'id, [row+tag], row, tag, scope, subject, topic, book, author',
      indexTopics: 'id, [row+tag], row, tag, book, author',
      concepts: 'id, [row+tag], row, tag, book, author',
      quotes: 'id, [row+tag], row, tag, book, author',
      passages: 'id, [row+tag], row, tag, book, author',
      characters: 'id, [row+tag], row, tag, book, author',
      places: 'id, [row+tag], row, tag, book, author',
      timeline: 'id, [row+tag], row, tag, book, author',
      relations: 'id, [row+tag], row, tag, book, author',
      glosary: 'id, [row+tag], row, tag, book, author',
      questions: 'id, [row+tag], row, tag, book, author',
    });
  }
}

@Injectable({
  providedIn: 'root',
})
export class AppDbService {
  readonly db = new AppDatabase();

  async clearAllTables(): Promise<void> {
    const tables = this.db.tables;
    await this.db.transaction('rw', tables, async () => {
      for (const table of tables) {
        await table.clear();
      }
    });
  }
}
