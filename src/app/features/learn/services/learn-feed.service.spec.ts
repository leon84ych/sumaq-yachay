// @vitest-environment jsdom

import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalDBService } from '../../../shared/local-db/local-db.service';
import { ConfigService } from '../../../core/services/config/config.service';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';
import { IndexRepository } from '../../domain/index/services/index-repository';
import { LearnFeedService } from './learn-feed.service';

describe('LearnFeedService', () => {
  let quoteRows: Record<string, unknown>[];
  let conceptRows: Record<string, unknown>[];
  let characterRows: Record<string, unknown>[];
  let characterRelationRows: Record<string, unknown>[];
  let conceptRelationRows: Record<string, unknown>[];
  let indexRows: Record<string, unknown>[];
  let remoteEnabled: boolean;
  let fetchIndex: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    quoteRows = Array.from({ length: 21 }, (_, index) => ({
      id: `quote-${index + 1}`,
      bookId: 'book-001', bookRow: 1, itemRow: index + 2,
      quote: `Quote ${index + 1}`,
      analysis: `Analysis ${index + 1}`,
      tags: ['#sample'],
    }));
    conceptRows = [];
    characterRows = [];
    characterRelationRows = [];
    conceptRelationRows = [];
    indexRows = [];
    remoteEnabled = false;
    fetchIndex = vi.fn(async () => {
      indexRows.push({ id: 'remote', bookId: 'book-001', theme: 'Remote entry', tags: [] });
      return [];
    });

    const emptyTable = { toArray: vi.fn().mockResolvedValue([]) };
    TestBed.configureTestingModule({
      providers: [
        LearnFeedService,
        {
          provide: LocalDBService,
          useValue: {
            indexedDB: {
              books: {
                toArray: vi
                  .fn()
                  .mockResolvedValue([
                    { id: 'book-001', row: 1, name: 'Book One', author: 'Author One' },
                  ]),
              },
              indexes: { toArray: vi.fn(async () => indexRows) },
              table: (name: string) => ({
                where: () => ({ equals: () => ({
                  filter: (predicate: (row: Record<string, unknown>) => boolean) => ({
                    count: async () => name === 'indexes' ? indexRows.filter(predicate).length : 0,
                  }),
                }) }),
              }),
              bookEvents: emptyTable,
              concepts: { toArray: vi.fn().mockImplementation(async () => conceptRows) },
              quotes: { toArray: vi.fn().mockImplementation(async () => quoteRows) },
              passages: emptyTable,
              characters: { toArray: vi.fn().mockImplementation(async () => characterRows) },
              places: emptyTable,
              relations: {
                toArray: vi.fn().mockImplementation(async () => characterRelationRows),
              },
              associations: {
                toArray: vi.fn().mockImplementation(async () => conceptRelationRows),
              },
              glossary: emptyTable,
              questions: emptyTable,
            },
          },
        },
        {
          provide: ConfigService,
          useValue: { isLocalSampleDataEnabled: () => false },
        },
        { provide: GoogleAuthService, useValue: { idToken: () => remoteEnabled ? 'token' : null } },
        { provide: IndexRepository, useValue: { getDomain: fetchIndex } },
      ],
    });
  });

  it('loads random batches of twenty and skips IDs already shown', async () => {
    const service = TestBed.inject(LearnFeedService);
    const firstBatch = await service.loadRandomBatch(new Set());
    const secondBatch = await service.loadRandomBatch(new Set(firstBatch.map((entry) => entry.id)));

    expect(firstBatch).toHaveLength(20);
    expect(secondBatch).toHaveLength(1);
    expect(firstBatch[0]).toMatchObject({ bookName: 'Book One', bookAuthor: 'Author One' });
    expect(new Set([...firstBatch, ...secondBatch].map((entry) => entry.id)).size).toBe(21);
  });

  it('filters entries by book, domain, and tags before slicing the batch', async () => {
    quoteRows[0]['tags'] = ['#rare-tag'];
    const service = TestBed.inject(LearnFeedService);

    const byBook = await service.loadRandomBatch(new Set(), 50, 'book one');
    const byAuthor = await service.loadRandomBatch(new Set(), 50, 'author one');
    const byDomain = await service.loadRandomBatch(new Set(), 50, 'quotes');
    const byTag = await service.loadRandomBatch(new Set(), 50, 'rare-tag');
    const noMatches = await service.loadRandomBatch(new Set(), 50, 'missing');

    expect(byBook).toHaveLength(21);
    expect(byAuthor).toHaveLength(21);
    expect(byDomain).toHaveLength(21);
    expect(byTag).toHaveLength(1);
    expect(byTag[0].tags).toContain('#rare-tag');
    expect(noMatches).toHaveLength(0);
  });

  it('includes available relation domains in a batch and searches their full text', async () => {
    conceptRows = [
      { id: 'concept-1', bookId: 'book-001', term: 'Memory' },
      { id: 'concept-2', bookId: 'book-001', term: 'Identity' },
      { id: 'concept-1', bookId: 'another-book', term: 'Wrong name' },
    ];
    characterRows = [
      { id: 'character-1', bookId: 'book-001', name: 'Mara' },
      { id: 'character-2', bookId: 'book-001', name: 'Ilan' },
      { id: 'character-1', bookId: 'another-book', name: 'Wrong name' },
    ];
    characterRelationRows = [
      {
        id: 'character-relation-1',
        bookId: 'book-001',
        sourceCharacterId: 'character-1',
        targetCharacterId: 'character-2',
        relationType: 'childhood friends',
        description: 'Their shared history shapes the story.',
      },
    ];
    conceptRelationRows = [
      {
        id: 'concept-relation-1',
        bookId: 'book-001',
        sourceConceptId: 'concept-1',
        targetConceptId: 'concept-2',
        relationType: 'memory shapes identity',
        description: 'Past experience changes the characters’ sense of self.',
      },
    ];
    const service = TestBed.inject(LearnFeedService);

    const batch = await service.loadRandomBatch(new Set(), 20);
    const conceptRelation = batch.find((entry) => entry.domain === 'ASSOCIATIONS');
    const characterRelation = batch.find((entry) => entry.domain === 'RELATIONS');
    const byRelationType = await service.loadRandomBatch(new Set(), 50, 'memory shapes identity');

    expect(conceptRelation).toMatchObject({
      title: 'Memory -> Identity',
      body: 'memory shapes identity\n\nPast experience changes the characters’ sense of self.',
    });
    expect(characterRelation).toMatchObject({
      title: 'Mara -> Ilan',
      body: 'childhood friends\n\nTheir shared history shapes the story.',
    });
    expect(byRelationType.map((entry) => entry.domain)).toContain('ASSOCIATIONS');
  });

  it('loads remote domains through the new repository', async () => {
    quoteRows = [];
    remoteEnabled = true;
    const batch = await TestBed.inject(LearnFeedService).loadRemoteBatch(new Set(), 1);
    expect(fetchIndex).toHaveBeenCalledWith(1);
    expect(batch[0]).toMatchObject({ domain: 'INDEX', title: 'Remote entry' });
  });

  it('does not refresh a domain with pending local changes', async () => {
    quoteRows = [];
    indexRows = [{ id: 'pending', bookId: 'book-001', theme: 'Local edit', syncStatus: 'pending' }];
    remoteEnabled = true;
    await TestBed.inject(LearnFeedService).loadRemoteBatch(new Set(), 1, 'not found');
    expect(fetchIndex).not.toHaveBeenCalled();
  });

});
