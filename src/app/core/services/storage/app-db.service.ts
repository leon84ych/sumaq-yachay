import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { CatalogItem } from '../../../features/catalog/models/catalog-item.model';

export interface DomainSheetCount {
  row: number;
  count: number;
}

export interface IndexTopic {
  id: string;
  row: number;
  tag: string;
  chapter: string;
  theme: string;
  subtheme: string;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface Concept {
  id: string;
  row: number;
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
  tag: string;
  quote: string;
  analysis: string;
  author: string;
  page: string;
  tags: string;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface Passage {
  id: string;
  row: number;
  tag: string;
  title: string;
  passageText: string;
  book: string;
  author: string;
  page: string;
  tags: string;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface TimelineEntry {
  id: string;
  row: number;
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
  tag: string;
  label: string;
  definition: string;
  examples: string;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface Question {
  id: string;
  row: number;
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
  indexTopics!: Table<IndexTopic, string>;
  concepts!: Table<Concept, string>;
  quotes!: Table<Quote, string>;
  passages!: Table<Passage, string>;
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
      indexTopics: 'id, [row+tag], row, tag',
      concepts: 'id, [row+tag], row, tag',
      quotes: 'id, [row+tag], row, tag',
      passages: 'id, [row+tag], row, tag',
      timeline: 'id, [row+tag], row, tag',
      relations: 'id, [row+tag], row, tag',
      glosary: 'id, [row+tag], row, tag',
      questions: 'id, [row+tag], row, tag',
    });
  }
}

@Injectable({
  providedIn: 'root',
})
export class AppDbService {
  readonly db = new AppDatabase();
}
