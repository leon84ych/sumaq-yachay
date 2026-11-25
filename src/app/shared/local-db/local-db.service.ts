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
import { BookEventRecord } from '../../features/domain-1/book-events/model/book-events-model';
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
  indexes!: Table<IndexRecord, string>;
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
  tags!: Table<TagRecord, string>;

  constructor(databaseName = 'LocalDB') {
    super(databaseName);
    this.version(1).stores(VERSION_ONE_STORES);
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
