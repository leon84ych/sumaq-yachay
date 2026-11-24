import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { IndexRecord } from '../../features/domain-1/index/model/index-model';
import { QuoteRecord } from '../../features/domain-1/quotes/model/quotes-model';
import { ConceptRecord } from '../../features/domain-1/concepts/model/concepts-model';
import { PassageRecord } from '../../features/domain-1/passages/model/passages-model';
import { CharacterRecord } from '../../features/domain-1/characters/model/characters-model';
import { GlossaryRecord } from '../../features/domain-1/glossary/model/glossary-model';
import { PlaceRecord } from '../../features/domain-1/places/model/places-model';
import { RelationRecord } from '../../features/domain-1/relations/model/relations-model';
import { QuestionRecord } from '../../features/domain-1/questions/model/questions-model';
import { AssociationRecord } from '../../features/domain-1/associations/model/associations-model';
import { BookRecord } from '../../features/book/models/book-item.model';
import { TagRecord } from '../tag-picker/tag-picker.model';

const VERSION_ONE_STORES = {
  books:
    'id, row, subject, topic, name, author, description, source, active, syncStatus, updatedAt',
  indexes: '[bookId+id], bookId, id, row, book, author, *tags',
  tags: '[bookId+id], bookId, id, row, name, scope, subject, topic, book, author',
  quotes: '[bookId+id], bookId, id, bookRow, itemRow, author, *tags',
  concepts: '[bookId+id], bookId, id, bookRow, itemRow, category, *tags',
  passages: '[bookId+id], bookId, id, bookRow, itemRow, author, *tags',
} as const;

const VERSION_TWO_STORES = {
  ...VERSION_ONE_STORES,
  characters: '[bookId+id], bookId, id, bookRow, itemRow, role, nature, *tags',
} as const;

const VERSION_THREE_STORES = {
  ...VERSION_TWO_STORES,
  glossary: '[bookId+id], bookId, id, bookRow, itemRow, term, partOfSpeech, *tags',
} as const;

const VERSION_FOUR_STORES = {
  ...VERSION_THREE_STORES,
  places: '[bookId+id], bookId, id, bookRow, itemRow, name, type, nature, *tags',
} as const;

const VERSION_FIVE_STORES = {
  ...VERSION_FOUR_STORES,
  relations:
    '[bookId+id], bookId, id, bookRow, itemRow, sourceCharacterId, targetCharacterId, *tags',
} as const;

const VERSION_SIX_STORES = {
  ...VERSION_FIVE_STORES,
  associations:
    '[bookId+id], bookId, id, bookRow, itemRow, sourceConceptId, targetConceptId, *tags',
} as const;

const VERSION_SEVEN_STORES = {
  ...VERSION_SIX_STORES,
  questions: '[bookId+id], bookId, id, bookRow, itemRow, type, sourceDomain, *tags',
} as const;

export class IndexedDB extends Dexie {
  books!: Table<BookRecord, string>;
  indexes!: Table<IndexRecord, string>;
  quotes!: Table<QuoteRecord, [string, string]>;
  concepts!: Table<ConceptRecord, [string, string]>;
  passages!: Table<PassageRecord, [string, string]>;
  characters!: Table<CharacterRecord, [string, string]>;
  glossary!: Table<GlossaryRecord, [string, string]>;
  places!: Table<PlaceRecord, [string, string]>;
  relations!: Table<RelationRecord, [string, string]>;
  associations!: Table<AssociationRecord, [string, string]>;
  questions!: Table<QuestionRecord, [string, string]>;
  tags!: Table<TagRecord, string>;

  constructor(databaseName = 'LocalDB') {
    super(databaseName);
    this.version(1).stores(VERSION_ONE_STORES);
    this.version(2).stores(VERSION_TWO_STORES);
    this.version(3).stores(VERSION_THREE_STORES);
    this.version(4).stores(VERSION_FOUR_STORES);
    this.version(5).stores(VERSION_FIVE_STORES);
    this.version(6).stores(VERSION_SIX_STORES);
    this.version(7).stores(VERSION_SEVEN_STORES);
  }
}

@Injectable({ providedIn: 'root' })
export class LocalDBService {
  readonly indexedDB = new IndexedDB();

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
