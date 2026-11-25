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

  constructor(databaseName = 'LocalDB') {
    super(databaseName);
    this.version(1).stores(VERSION_ONE_STORES);
    this.version(2).stores({ questionAttempts: '++id, questionId, bookId, bookRow, timestamp, type' });
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
    const data = await Promise.all(LOCAL_SAMPLE_BOOKS.map((book) => getLocalSampleDomainData(book.id)));
    const db = this.indexedDB;
    await db.transaction('rw', db.tables, async () => {
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
    this.samplesSeeded = false;
  }

  async resetDatabase(): Promise<void> {
    // Close the database connection
    this.indexedDB.close();

    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(this.indexedDB.name);

      deleteRequest.onsuccess = () => {
        // Recreate the database by opening it again
        const openRequest = indexedDB.open(this.indexedDB.name, 2);

        openRequest.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          // Recreate all object stores
          if (!db.objectStoreNames.contains('books')) {
            db.createObjectStore('books', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('indexes')) {
            db.createObjectStore('indexes', { keyPath: ['bookId', 'id'] });
          }
          if (!db.objectStoreNames.contains('quotes')) {
            db.createObjectStore('quotes', { keyPath: ['bookId', 'id'] });
          }
          if (!db.objectStoreNames.contains('concepts')) {
            db.createObjectStore('concepts', { keyPath: ['bookId', 'id'] });
          }
          if (!db.objectStoreNames.contains('passages')) {
            db.createObjectStore('passages', { keyPath: ['bookId', 'id'] });
          }
          if (!db.objectStoreNames.contains('characters')) {
            db.createObjectStore('characters', { keyPath: ['bookId', 'id'] });
          }
          if (!db.objectStoreNames.contains('glossary')) {
            db.createObjectStore('glossary', { keyPath: ['bookId', 'id'] });
          }
          if (!db.objectStoreNames.contains('places')) {
            db.createObjectStore('places', { keyPath: ['bookId', 'id'] });
          }
          if (!db.objectStoreNames.contains('relations')) {
            db.createObjectStore('relations', { keyPath: ['bookId', 'id'] });
          }
          if (!db.objectStoreNames.contains('associations')) {
            db.createObjectStore('associations', { keyPath: ['bookId', 'id'] });
          }
          if (!db.objectStoreNames.contains('bookEvents')) {
            db.createObjectStore('bookEvents', { keyPath: ['bookId', 'id'] });
          }
          if (!db.objectStoreNames.contains('questions')) {
            db.createObjectStore('questions', { keyPath: ['bookId', 'id'] });
          }
          if (!db.objectStoreNames.contains('questionAttempts')) {
            db.createObjectStore('questionAttempts', { keyPath: 'id', autoIncrement: true });
          }
          if (!db.objectStoreNames.contains('tags')) {
            db.createObjectStore('tags', { keyPath: 'id' });
          }
        };

        openRequest.onsuccess = () => {
          this.samplesSeeded = false;
          resolve();
        };

        openRequest.onerror = () => {
          reject(new Error('Failed to reopen database after reset'));
        };
      };

      deleteRequest.onerror = () => {
        reject(new Error('Failed to delete database'));
      };

      deleteRequest.onblocked = () => {
        console.warn('Delete blocked. Close all other open connections/tabs first.');
      };
    });
  }
}
