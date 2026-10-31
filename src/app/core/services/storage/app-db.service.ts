import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { CatalogItem } from '../../../features/catalog/models/catalog-item.model';
import { BookEventRecord } from '../../../features/domain/domain-book-events/model/book-event-row.model';
import { CharacterRecord } from '../../../features/domain/domain-character/models/domain-character-row.model';
import { ConceptRecord } from '../../../features/domain/domain-concepts/model/domain-concept-row.model';
import { GlossaryEntryRecord } from '../../../features/domain/domain-glosary/model/domain-glosary-row.model';
import { IndexTopicRecord } from '../../../features/domain/domain-index/model/index-view-row';
import { PassageRecord } from '../../../features/domain/domain-passages/model/domain-passage-row.model';
import { PlaceRecord } from '../../../features/domain/domain-places/model/domain-place-row.model';
import { QuestionRecord } from '../../../features/domain/domain-questions/model/domain-question-row.model';
import { QuestionAttempt } from '../../../features/domain/domain-questions/model/question-attempt.model';
import { QuoteRecord } from '../../../features/domain/domain-quotes/model/domain-quote-row.model';
import { BookRelationRecord } from '../../../features/domain/domain-relations/model/book-relation.model';
import { BookAssociationRecord } from '../../../features/domain/domain-association/model/book-association.model';
import {
  LOCAL_SAMPLE_CATALOG,
  LOCAL_SAMPLE_DOMAIN_TABLES,
  getLocalSampleDomainData,
  normalizeSampleDomainRow,
} from './local-sample-data';

const VERSION_ONE_STORES = {
  catalogs:
    'id, subject, topic, name, author, description, source, active, syncStatus, updatedAt',
  domainSheets: 'row, count',
  bookTags: 'id, [row+name], row, name, scope, subject, topic, book, author',
  indexTopics: 'id, row, book, author, *tags',
  concepts: 'id, row, book, author, *tags',
  quotes: 'id, row, book, author, *tags',
  passages: 'id, row, book, author, *tags',
  characters: 'id, row, book, author, *tags',
  places: 'id, row, book, author, *tags',
  bookEvents: 'id, row, book, author, *tags',
  relationsCharacters: 'id, row, book, author, *tags',
  relationsConcepts: 'id, row, book, author, *tags',
  glosary: 'id, row, book, author, *tags',
  questions: 'id, row, book, author, *tags',
  questionAttempts: '++id, questionId, bookRow, timestamp, type',
} as const;

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
  name: string;
  domain?: string;
  usageCount?: number;
}

export class AppDatabase extends Dexie {
  catalogs!: Table<CatalogItem, string>;
  domainSheets!: Table<DomainSheetCount, number>;
  bookTags!: Table<BookTag, string>;
  indexTopics!: Table<IndexTopicRecord, string>;
  concepts!: Table<ConceptRecord, string>;
  quotes!: Table<QuoteRecord, string>;
  passages!: Table<PassageRecord, string>;
  characters!: Table<CharacterRecord, string>;
  places!: Table<PlaceRecord, string>;
  bookEvents!: Table<BookEventRecord, string>;
  relationsCharacters!: Table<BookRelationRecord, string>;
  relationsConcepts!: Table<BookAssociationRecord, string>;
  glosary!: Table<GlossaryEntryRecord, string>;
  questions!: Table<QuestionRecord & Record<string, unknown>, string>;
  questionAttempts!: Table<QuestionAttempt, number>;

  constructor(databaseName = 'SumaqYachayDB') {
    super(databaseName);
    this.version(1).stores(VERSION_ONE_STORES);
  }
}

@Injectable({ providedIn: 'root' })
export class AppDbService {
  readonly db = new AppDatabase();

  async seedLocalSampleData(): Promise<void> {
    const sampleDomainDataByBookId = new Map<string, Record<string, Record<string, unknown>[]>>();
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
          for (const sampleRow of rows) {
            const id = `${catalogItem.id}-${String(sampleRow['id'])}`;
            const existingRow = await table.get(id);
            if (!existingRow) {
              missingRows.push({
                ...normalizeSampleDomainRow(sampleRow),
                id,
                row: catalogItem.row,
                ...(Object.hasOwn(sampleRow, 'book') ? { book: catalogItem.name } : {}),
                ...(Object.hasOwn(sampleRow, 'author') && domainName !== 'QUOTES'
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
