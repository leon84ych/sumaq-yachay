import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { IndexRecord } from '../../features/domain/index/model/index-model';
import { QuoteRecord } from '../../features/domain/quotes/model/quotes-model';
import { ConceptRecord } from '../../features/domain/concepts/model/concepts-model';
import { PassageRecord } from '../../features/domain/passages/model/passages-model';
import { CharacterRecord } from '../../features/domain/characters/model/characters-model';
import { GlossaryRecord } from '../../features/domain/glossary/model/glossary-model';
import { PlaceRecord } from '../../features/domain/places/model/places-model';
import { RelationRecord } from '../../features/domain/relations/model/relations-model';
import { QuestionRecord } from '../../features/domain/questions/model/questions-model';
import { AssociationRecord } from '../../features/domain/associations/model/associations-model';
import { BookEventRecord } from '../../features/domain/book-events/model/book-events-model';
import { BookRecord } from '../../features/book/models/book-item.model';
import { TagRecord } from '../tag-picker/tag-picker.model';
import { QuestionAttempt } from '../../features/domain/questions/model/question-attempt.model';
import { getLocalSampleDomainData, LOCAL_SAMPLE_BOOKS, LOCAL_SAMPLE_DOMAIN_TABLES, normalizeSampleDomainRow } from '../../core/services/storage/local-sample-data';
import { Domain } from '../../features/domain/shared/model/domain-shared-model';

export interface PendingDomainWrite {
  domain: string;
  bookId: string;
  id: string;
  operation: 'create' | 'update' | 'delete';
  state: 'queued' | 'sending' | 'uncertain';
  revision: number;
  record: Domain;
  lastError?: string;
  retryAt?: number;
  attempts?: number;
  needsItemRow?: boolean;
  ownerEmail?: string;
  createMayExist?: boolean;
  deleteAfterCreate?: boolean;
}

const VERSION_ONE_STORES = {
  books:
    'id, row, subject, topic, name, author, description, source, active, syncStatus, updatedAt',
  indexes: '[bookId+id], bookId, id, row, book, author, *tags',
  tags: '[bookId+id], bookId, id, row, name, scope, subject, topic, book, author',
  quotes: '[bookId+id], bookId, id, bookRow, itemRow, author, *tags',
  concepts: '[bookId+id], bookId, id, bookRow, itemRow, category, *tags',
  passages: '[bookId+id], bookId, id, bookRow, itemRow, author, *tags',
  characters: '[bookId+id], bookId, id, bookRow, itemRow, role, nature, *tags',
  glossary: '[bookId+id], bookId, id, bookRow, itemRow, term, partOfSpeech, *tags',
  places: '[bookId+id], bookId, id, bookRow, itemRow, name, type, nature, *tags',
  relations:
    '[bookId+id], bookId, id, bookRow, itemRow, sourceCharacterId, targetCharacterId, *tags',
  associations:
    '[bookId+id], bookId, id, bookRow, itemRow, sourceConceptId, targetConceptId, *tags',
  bookEvents:
    '[bookId+id], bookId, id, bookRow, itemRow, eventOrder, mainCharacterId, placeId, *tags',
  questions: '[bookId+id], bookId, id, bookRow, itemRow, type, sourceDomain, *tags',
} as const;

export class IndexedDB extends Dexie {
  books!: Table<BookRecord, string>;
  indexes!: Table<IndexRecord, [string, string]>;
  quotes!: Table<QuoteRecord, [string, string]>;
  concepts!: Table<ConceptRecord, [string, string]>;
  passages!: Table<PassageRecord, [string, string]>;
  characters!: Table<CharacterRecord, [string, string]>;
  glossary!: Table<GlossaryRecord, [string, string]>;
  places!: Table<PlaceRecord, [string, string]>;
  relations!: Table<RelationRecord, [string, string]>;
  associations!: Table<AssociationRecord, [string, string]>;
  bookEvents!: Table<BookEventRecord, [string, string]>;
  questions!: Table<QuestionRecord, [string, string]>;
  questionAttempts!: Table<QuestionAttempt, number>;
  tags!: Table<TagRecord, string>;
  metadata!: Table<{ key: string; lastBookRow?: number; targetId?: string; leaseOwner?: string; leaseExpiresAt?: number }, string>;
  languages!: Table<{ key: string; name: string }, string>;
  pendingDomainWrites!: Table<PendingDomainWrite, [string, string, string]>;

  constructor(databaseName = 'LocalDB') {
    super(databaseName);
    this.version(1).stores(VERSION_ONE_STORES);
    this.version(2).stores({ questionAttempts: '++id, questionId, bookId, bookRow, timestamp, type' });
    this.version(3).stores({ metadata: 'key' });
    this.version(4).stores({ languages: 'key' });
    this.version(5).stores({ pendingDomainWrites: '[domain+bookId+id], [domain+state], bookId' });
  }
}

@Injectable({ providedIn: 'root' })
export class LocalDBService {
  readonly indexedDB = new IndexedDB();
  private sampleSeedPromise: Promise<void> | null = null;
  private samplesSeeded = false;

  seedLocalSampleData(): Promise<void> {
    if (this.samplesSeeded) return Promise.resolve();
    if (!this.sampleSeedPromise) {
      this.sampleSeedPromise = this.seedSamples()
        .then(() => { this.samplesSeeded = true; })
        .finally(() => { this.sampleSeedPromise = null; });
    }
    return this.sampleSeedPromise;
  }

  private async seedSamples(): Promise<void> {
    const db = this.indexedDB;
    if (await db.metadata.get('sample-data-seeded')) return;
    const data = await Promise.all(LOCAL_SAMPLE_BOOKS.map((book) => getLocalSampleDomainData(book.id)));
    await db.transaction('rw', db.tables, async () => {
      if (await db.metadata.get('sample-data-seeded')) return;
      for (const [bookIndex, book] of LOCAL_SAMPLE_BOOKS.entries()) {
        if (!(await db.books.get(book.id))) await db.books.add(book);
        for (const [domain, rows] of Object.entries(data[bookIndex])) {
          const tableName = LOCAL_SAMPLE_DOMAIN_TABLES[domain];
          if (!tableName || rows.length === 0) continue;
          const table = db.table<Record<string, unknown>, [string, string]>(tableName);
          const records = rows.map((row, index) => ({
            ...normalizeSampleDomainRow(row),
            id: `${book.id}-${String(row['id'])}`,
            bookId: book.id,
            bookRow: book.row,
            itemRow: index + 2,
            feed: row['feed'] ?? 5,
            ...(domain === 'QUESTIONS' ? { options: row['options'] ?? [], aiGenerated: row['aiGenerated'] ?? false } : {}),
          }));
          const existing = await table.bulkGet(records.map((record) => [book.id, record.id]));
          await table.bulkAdd(records.filter((_, index) => !existing[index]));
        }
      }
      const books = await db.books.toArray();
      await db.metadata.put({
        key: 'sample-data-seeded',
        lastBookRow: Math.max(0, ...books.map(book => book.row)),
      });
    });
  }

  async getBooks(): Promise<BookRecord[]> {
    return this.indexedDB.books.toArray();
  }

  async clearAllTables(): Promise<void> {
    const tables = this.indexedDB.tables;
    await this.indexedDB.transaction('rw', tables, async () => {
      for (const table of tables) {
        await table.clear();
      }
    });
  }
}
