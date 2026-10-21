import { describe, expect, it } from 'vitest';
import { ALL_AVAILABLE_DOMAINS } from '../../../features/catalog-detail/models/domain-sheet-config';
import { AppDatabase } from './app-db.service';
import {
  LOCAL_SAMPLE_CATALOG,
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

    for (const catalogItem of LOCAL_SAMPLE_CATALOG) {
      const characters = (await getLocalSampleDomainData(catalogItem.id))['CHARACTER'];
      const colors = characters.map((character) => character['color']);

      expect(colors).toHaveLength(10);
      expect([...colors].sort()).toEqual([...expectedColors].sort());
    }
  });

  it('loads the matching JSON fixture for every catalog item', async () => {
    const populatedDomains = [
      'INDEX',
      'CHARACTER',
      'CONCEPTS',
      'GLOSARY',
      'PASSAGES',
      'PLACES',
      'QUOTES',
    ];

    for (const catalogItem of LOCAL_SAMPLE_CATALOG) {
      const domainData = await getLocalSampleDomainData(catalogItem.id);
      expect(Object.keys(domainData).sort(), catalogItem.id).toEqual(
        [...ALL_AVAILABLE_DOMAINS].sort(),
      );

      for (const [domain, rows] of Object.entries(domainData)) {
        for (const row of rows) {
          expect(Array.isArray(row['tags']), `${catalogItem.id} ${domain} tags`).toBe(true);
          expect(row, `${catalogItem.id} ${domain}`).not.toHaveProperty('tag');
        }
      }

      for (const domain of populatedDomains) {
        const rows = domainData[domain];
        expect(rows, `${catalogItem.id} ${domain}`).toHaveLength(10);
        expect(rows.every((row) => typeof row['id'] === 'string')).toBe(true);
      }

      const characterIds = new Set(
        domainData['CHARACTER'].map((character) => `${catalogItem.id}-${String(character['id'])}`),
      );
      const conceptIds = new Set(
        domainData['CONCEPTS'].map((concept) => `${catalogItem.id}-${String(concept['id'])}`),
      );
      const bookEvents = domainData['BOOK_EVENTS'];
      const characterRelations = domainData['RELATIONS_CHARACTERS'];
      const conceptRelations = domainData['RELATIONS_CONCEPTS'];

      expect(bookEvents, catalogItem.id).toHaveLength(4);
      expect(characterRelations, catalogItem.id).toHaveLength(4);
      expect(conceptRelations, catalogItem.id).toHaveLength(4);
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
      expect(domainData['QUESTIONS'], catalogItem.id).toEqual([]);
    }
  });

  it('returns empty domain data for unknown catalog IDs', async () => {
    const domainData = await getLocalSampleDomainData('unknown-book');

    expect(Object.values(domainData).every((rows) => rows.length === 0)).toBe(true);
  });

  it('loads the sample catalog entries from the bundled JSON file', () => {
    expect(LOCAL_SAMPLE_CATALOG[0]).toMatchObject({
      id: 'book-001',
      name: 'Ulysses',
      row: 1,
      syncStatus: 'synced',
    });
    expect(new Set(LOCAL_SAMPLE_CATALOG.map((item) => item.row)).size).toBe(
      LOCAL_SAMPLE_CATALOG.length,
    );
  });

  it('maps every sample domain to an existing IndexedDB table', async () => {
    const database = new AppDatabase();
    const book001Data = await getLocalSampleDomainData('book-001');
    const domainTables = database.tables
      .map((table) => table.name)
      .filter((name) => !['catalogs', 'domainSheets', 'bookTags'].includes(name));

    expect(Object.keys(LOCAL_SAMPLE_DOMAIN_TABLES).sort()).toEqual(Object.keys(book001Data).sort());
    expect(Object.values(LOCAL_SAMPLE_DOMAIN_TABLES).sort()).toEqual(domainTables.sort());
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
    });
  });
});
