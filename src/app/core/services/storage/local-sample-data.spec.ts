// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { ALL_AVAILABLE_DOMAINS } from '../../../features/domain/book-detail/models/domain-sheet-config';
import { IndexedDB } from '../../../shared/local-db/local-db.service';
import {
  LOCAL_SAMPLE_BOOKS,
  LOCAL_SAMPLE_DOMAIN_TABLES,
  getLocalSampleDomainData,
  normalizeSampleDomainRow,
} from './local-sample-data';

describe('LocalSampleData fixtures', () => {
  it('uses the requested ten-color palette once per book in randomized order', async () => {
    const expectedColors = [
      '#3A7D44',
      '#5C4D7D',
      '#D17B49',
      '#2F6690',
      '#A44A3F',
      '#6A994E',
      '#B56576',
      '#4F6D7A',
      '#C49A3A',
      '#735D78',
    ];

    for (const bookRecord of LOCAL_SAMPLE_BOOKS) {
      const characters = (await getLocalSampleDomainData(bookRecord.id))['CHARACTER'];
      const colors = characters.map((character) => character['color']);

      expect(colors).toHaveLength(10);
      expect([...colors].sort()).toEqual([...expectedColors].sort());
    }
  });

  it('loads the matching JSON fixture for every book item', async () => {
    const populatedDomains = [
      'INDEX',
      'CHARACTER',
      'CONCEPTS',
      'GLOSARY',
      'PASSAGES',
      'PLACES',
      'QUOTES',
    ];

    for (const bookRecord of LOCAL_SAMPLE_BOOKS) {
      const domainData = await getLocalSampleDomainData(bookRecord.id);
      expect(Object.keys(domainData).sort(), bookRecord.id).toEqual(
        [...ALL_AVAILABLE_DOMAINS].sort(),
      );

      for (const [domain, rows] of Object.entries(domainData)) {
        for (const row of rows) {
          expect(Array.isArray(row['tags']), `${bookRecord.id} ${domain} tags`).toBe(true);
          expect(row['contributor'], `${bookRecord.id} ${domain} contributor`).toBe('leon84ych');
          expect(row['syncStatus'], `${bookRecord.id} ${domain} sync status`).toBe('pending');
          expect(row, `${bookRecord.id} ${domain}`).not.toHaveProperty('tag');
        }
      }

      for (const domain of populatedDomains) {
        const rows = domainData[domain];
        expect(rows, `${bookRecord.id} ${domain}`).toHaveLength(10);
        expect(rows.every((row) => typeof row['id'] === 'string')).toBe(true);
      }

      const characterIds = new Set(
        domainData['CHARACTER'].map((character) => `${bookRecord.id}-${String(character['id'])}`),
      );
      const conceptIds = new Set(
        domainData['CONCEPTS'].map((concept) => `${bookRecord.id}-${String(concept['id'])}`),
      );
      const bookEvents = domainData['BOOK_EVENTS'];
      const characterRelations = domainData['RELATIONS'];
      const conceptRelations = domainData['ASSOCIATIONS'];

      expect(bookEvents, bookRecord.id).toHaveLength(4);
      expect(characterRelations, bookRecord.id).toHaveLength(4);
      expect(conceptRelations, bookRecord.id).toHaveLength(4);
      expect(bookEvents.every((event) => characterIds.has(String(event['mainCharacterId'])))).toBe(
        true,
      );
      expect(
        characterRelations.every(
          (relation) =>
            characterIds.has(String(relation['sourceCharacterId'])) &&
            characterIds.has(String(relation['targetCharacterId'])),
        ),
      ).toBe(true);
      expect(
        conceptRelations.every(
          (relation) =>
            conceptIds.has(String(relation['sourceConceptId'])) &&
            conceptIds.has(String(relation['targetConceptId'])),
        ),
      ).toBe(true);
      expect(
        [...bookEvents, ...characterRelations, ...conceptRelations].every(
          (entry, indexWithinDomain) => entry['displayRow'] === (indexWithinDomain % 4) + 1,
        ),
      ).toBe(true);
    }
  });

  it('provides ten localized questions with valid domain sources for every book', async () => {
    const supportedTypes = new Set(['flashcard', 'multiple-choice', 'true-false', 'open']);

    for (const bookRecord of LOCAL_SAMPLE_BOOKS) {
      const domainData = await getLocalSampleDomainData(bookRecord.id);
      const questions = domainData['QUESTIONS'];
      expect(questions, bookRecord.id).toHaveLength(10);

      for (const question of questions) {
        expect(question['question']).toBeTruthy();
        expect(question['answer']).toBeTruthy();
        expect(question['bookRow']).toBe(bookRecord.row);
        expect(supportedTypes.has(String(question['type']))).toBe(true);

        const sourceRows = domainData[String(question['sourceDomain'])];
        expect(
          sourceRows.some((row) => row['id'] === question['sourceRowId']),
          `${bookRecord.id} ${String(question['id'])} source`,
        ).toBe(true);

        if (question['type'] === 'multiple-choice' || question['type'] === 'true-false') {
          const options = question['options'] as Array<{ isCorrect: boolean }>;
          expect(options.filter((option) => option.isCorrect)).toHaveLength(1);
        }
      }
    }
  });

  it('returns empty domain data for unknown book IDs', async () => {
    const domainData = await getLocalSampleDomainData('unknown-book');

    expect(Object.values(domainData).every((rows) => rows.length === 0)).toBe(true);
  });

  it('loads the sample book entries from the bundled JSON file', () => {
    expect(LOCAL_SAMPLE_BOOKS[0]).toMatchObject({
      id: 'book-001',
      name: 'Ulysses',
      row: 1,
      syncStatus: 'pending',
    });
    expect(LOCAL_SAMPLE_BOOKS.every((book) => book.syncStatus === 'pending')).toBe(true);
    expect(new Set(LOCAL_SAMPLE_BOOKS.map((item) => item.row)).size).toBe(
      LOCAL_SAMPLE_BOOKS.length,
    );
    const isValidIsbn13 = (isbn: string): boolean => {
      if (!/^\d{13}$/.test(isbn)) return false;
      const checksum = [...isbn.slice(0, 12)].reduce(
        (sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 1 : 3),
        0,
      );
      return (10 - (checksum % 10)) % 10 === Number(isbn[12]);
    };

    expect(new Set(LOCAL_SAMPLE_BOOKS.map((item) => item.isbn)).size).toBe(LOCAL_SAMPLE_BOOKS.length);
    for (const book of LOCAL_SAMPLE_BOOKS) {
      expect(isValidIsbn13(book.isbn), book.id).toBe(true);
      expect(book.language, book.id).toBe(book.id.includes('-es-') ? 'Spanish' : 'English');
    }
  });

  it('maps every sample domain to an existing IndexedDB table', async () => {
    const database = new IndexedDB();
    const book001Data = await getLocalSampleDomainData('book-001');
    const domainTables = database.tables
      .map((table) => table.name)
      .filter((name) => !['books', 'tags', 'questionAttempts'].includes(name));

    expect(Object.keys(LOCAL_SAMPLE_DOMAIN_TABLES).sort()).toEqual(Object.keys(book001Data).sort());
    expect(Object.values(LOCAL_SAMPLE_DOMAIN_TABLES).sort()).toEqual(domainTables.sort());
    database.close();
  });

  it('adds the attempts store without removing the v1 questions store', () => {
    const database = new IndexedDB('LocalDB-schema-test');
    const tableNames = database.tables.map((table) => table.name);

    expect(database.verno).toBe(2);
    expect(tableNames).toContain('questions');
    expect(tableNames).toContain('questionAttempts');
    database.close();
  });

  it('normalizes all tag variants to a single array and normalizes synonyms', () => {
    expect(
      normalizeSampleDomainRow({
        tags: ['#first', '#second'],
        synonyms: ['first term', 'alternate term'],
      }),
    ).toEqual({
      tags: ['#first', '#second'],
      synonyms: 'first term, alternate term',
      contributor: 'leon84ych',
    });
  });

  it('updates legacy sample contributors without overwriting other contributors or content', () => {
    expect(normalizeSampleDomainRow({ contributor: 'Local Sample Data', term: 'Edited locally' }))
      .toMatchObject({ contributor: 'leon84ych', term: 'Edited locally' });
    expect(normalizeSampleDomainRow({ contributor: 'student@gmail.com' }))
      .toMatchObject({ contributor: 'student@gmail.com' });
  });
});
