// @vitest-environment jsdom

import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { IndexedDB, LocalDBService } from './local-db.service';

describe('LocalDBService', () => {
  const databaseName = 'local-db-spec';

  afterEach(async () => {
    await Dexie.delete(databaseName);
  });

  it('adds attempts when upgrading a v1 database without losing existing data', async () => {
    const oldDatabase = new Dexie(databaseName);
    oldDatabase.version(1).stores({ books: 'id, row', quotes: '[bookId+id], bookId, id' });
    await oldDatabase.table('books').add({ id: 'book-1', name: 'Existing book', row: 1 });
    await oldDatabase.table('quotes').add({ bookId: 'book-1', id: 'quote-1', quote: 'Existing' });
    oldDatabase.close();

    const db = new IndexedDB(databaseName);
    expect(await db.books.get('book-1')).toMatchObject({ name: 'Existing book' });
    expect(await db.quotes.get(['book-1', 'quote-1'])).toMatchObject({ quote: 'Existing' });
    await db.questionAttempts.add({ questionId: 'q-1', bookId: 'book-1', bookRow: 1, timestamp: '2026-01-01', userResponse: 'yes', isCorrect: true, type: 'open' });
    expect(await db.questionAttempts.where('bookId').equals('book-1').count()).toBe(1);
    db.close();
  });

  it('seeds v2 fixtures without replacing existing sample records', async () => {
    const service = new LocalDBService();
    const db = new IndexedDB(databaseName);
    Object.defineProperty(service, 'indexedDB', { value: db });
    await db.characters.put({ id: 'book-001-sample-character-01', bookId: 'book-001', bookRow: 1, itemRow: 2, name: 'Edited', role: 'protagonist', nature: 'fictitious', description: '', archetype: '', source: '', color: '', tags: [], feed: 1, contributor: '', syncStatus: 'pending' });
    await Promise.all([service.seedLocalSampleData(), service.seedLocalSampleData()]);
    expect(await db.books.get('book-001')).toBeDefined();
    expect(await db.characters.get(['book-001', 'book-001-sample-character-01'])).toMatchObject({ name: 'Edited', syncStatus: 'pending' });
    const relation = await db.relations.where('bookId').equals('book-001').first();
    expect(relation).toBeDefined();
    expect(await db.characters.get(['book-001', relation!.sourceCharacterId])).toBeDefined();
    expect(await db.questions.where('bookId').equals('book-001').first()).toMatchObject({ bookId: 'book-001', options: expect.any(Array) });
    db.close();
  });
});