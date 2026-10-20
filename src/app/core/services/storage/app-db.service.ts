import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { CatalogItem } from '../../../features/catalog/models/catalog-item.model';
import {
  LOCAL_SAMPLE_CATALOG,
  LOCAL_SAMPLE_DOMAIN_TABLES,
  getLocalSampleDomainData,
  normalizeSampleDomainRow,
} from './local-sample-data';

export interface DomainSheetCount {
  row: number;
  count: number;
  customSheets?: Array<{
    name: string;
    index: number;
    headers: string[];
    rows: Record<string, unknown>[];
  }>;
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
  color?: string;
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

  async seedLocalSampleData(): Promise<void> {
    const sampleDomainDataByBookId = new Map<
      string,
      Record<string, Record<string, unknown>[]>
    >();
    await Promise.all(
      LOCAL_SAMPLE_CATALOG.map(async (catalogItem) => {
        sampleDomainDataByBookId.set(
          catalogItem.id,
          await getLocalSampleDomainData(catalogItem.id),
        );
      }),
    );

    await this.db.transaction('rw', this.db.tables, async () => {
      for (const catalogItem of LOCAL_SAMPLE_CATALOG) {
        const existingItem = await this.db.catalogs.get(catalogItem.id);
        if (!existingItem) {
          await this.db.catalogs.put(catalogItem);
        } else if (existingItem.row !== catalogItem.row) {
          await this.db.catalogs.put({ ...existingItem, row: catalogItem.row });
        }
      }

      for (const catalogItem of LOCAL_SAMPLE_CATALOG) {
        const domainData = sampleDomainDataByBookId.get(catalogItem.id)!;
        for (const [domainName, rows] of Object.entries(domainData)) {
          const tableName = LOCAL_SAMPLE_DOMAIN_TABLES[domainName];
          const table = this.db.table(tableName) as Table<Record<string, unknown>, string>;
          const sampleIdPrefix = `${catalogItem.id}-sample-`;
          const expectedSampleIds = new Set(
            rows.map((sampleRow) => `${catalogItem.id}-${String(sampleRow['id'])}`),
          );
          const obsoleteSampleRows = await table
            .filter((record) => {
              const id = String(record['id']);
              return id.startsWith(sampleIdPrefix) && !expectedSampleIds.has(id);
            })
            .toArray();
          if (obsoleteSampleRows.length > 0) {
            await table.bulkDelete(obsoleteSampleRows.map((record) => String(record['id'])));
          }

          if (rows.length === 0) {
            continue;
          }

          const missingRows: Record<string, unknown>[] = [];

          for (const row of rows) {
            const id = `${catalogItem.id}-${String(row['id'])}`;
            const existingRow = await table.get(id);
            if (!existingRow) {
              missingRows.push({
                ...normalizeSampleDomainRow(row),
                id,
                row: catalogItem.row,
                ...(Object.hasOwn(row, 'book') ? { book: catalogItem.name } : {}),
                ...(Object.hasOwn(row, 'author') && domainName !== 'QUOTES'
                  ? { author: catalogItem.author }
                  : {}),
              });
            } else {
              const normalizedExisting = normalizeSampleDomainRow({
                ...existingRow,
                row: catalogItem.row,
              });
              if (JSON.stringify(normalizedExisting) !== JSON.stringify(existingRow)) {
                await table.put(normalizedExisting);
              }
            }
          }

          if (missingRows.length > 0) {
            await table.bulkPut(missingRows);
          }
        }

        const storedSheets = await this.db.domainSheets.get(catalogItem.row);
        await this.db.domainSheets.put({
          row: catalogItem.row,
          count:
            Object.values(domainData).filter((rows) => rows.length > 0).length +
            (storedSheets?.customSheets?.length ?? 0),
          ...(storedSheets?.customSheets ? { customSheets: storedSheets.customSheets } : {}),
        });
      }
    });
  }

  async clearAllTables(): Promise<void> {
    const tables = this.db.tables;
    await this.db.transaction('rw', tables, async () => {
      for (const table of tables) {
        await table.clear();
      }
    });
  }
}
