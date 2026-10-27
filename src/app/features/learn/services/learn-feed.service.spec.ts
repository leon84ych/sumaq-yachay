// @vitest-environment jsdom

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppDbService } from '../../../core/services/storage/app-db.service';
import { ConfigService } from '../../../core/services/config.service';
import { LearnFeedService } from './learn-feed.service';

describe('LearnFeedService', () => {
  let localSampleDataEnabled: boolean;
  let seedLocalSampleData: ReturnType<typeof vi.fn>;
  let quoteRows: Record<string, unknown>[];
  let conceptRows: Record<string, unknown>[];
  let characterRows: Record<string, unknown>[];
  let characterRelationRows: Record<string, unknown>[];
  let conceptRelationRows: Record<string, unknown>[];

  beforeAll(() => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
    localSampleDataEnabled = false;
    seedLocalSampleData = vi.fn().mockResolvedValue(undefined);
    quoteRows = Array.from({ length: 21 }, (_, index) => ({
      id: `quote-${index + 1}`,
      row: 1,
      quote: `Quote ${index + 1}`,
      analysis: `Analysis ${index + 1}`,
      tags: ['#sample'],
    }));
    conceptRows = [];
    characterRows = [];
    characterRelationRows = [];
    conceptRelationRows = [];

    const emptyTable = { toArray: vi.fn().mockResolvedValue([]) };
    TestBed.configureTestingModule({
      providers: [
        LearnFeedService,
        {
          provide: AppDbService,
          useValue: {
            seedLocalSampleData,
            db: {
              catalogs: {
                toArray: vi
                  .fn()
                  .mockResolvedValue([
                    { id: 'book-001', row: 1, name: 'Book One', author: 'Author One' },
                  ]),
              },
              indexTopics: emptyTable,
              concepts: { toArray: vi.fn().mockImplementation(async () => conceptRows) },
              quotes: { toArray: vi.fn().mockImplementation(async () => quoteRows) },
              passages: emptyTable,
              characters: { toArray: vi.fn().mockImplementation(async () => characterRows) },
              places: emptyTable,
              relationsCharacters: {
                toArray: vi.fn().mockImplementation(async () => characterRelationRows),
              },
              relationsConcepts: {
                toArray: vi.fn().mockImplementation(async () => conceptRelationRows),
              },
              glosary: emptyTable,
              questions: emptyTable,
            },
          } as unknown as AppDbService,
        },
        {
          provide: ConfigService,
          useValue: { isLocalSampleDataEnabled: () => localSampleDataEnabled },
        },
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
      { id: 'concept-1', row: 1, term: 'Memory' },
      { id: 'concept-2', row: 1, term: 'Identity' },
    ];
    characterRows = [
      { id: 'character-1', row: 1, name: 'Mara' },
      { id: 'character-2', row: 1, name: 'Ilan' },
    ];
    characterRelationRows = [
      {
        id: 'character-relation-1',
        row: 1,
        sourceCharacterId: 'character-1',
        targetCharacterId: 'character-2',
        relationType: 'childhood friends',
        description: 'Their shared history shapes the story.',
      },
    ];
    conceptRelationRows = [
      {
        id: 'concept-relation-1',
        row: 1,
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

  it('seeds local sample fixtures before reading when LocalSampleData is enabled', async () => {
    localSampleDataEnabled = true;

    await TestBed.inject(LearnFeedService).loadRandomBatch(new Set());

    expect(seedLocalSampleData).toHaveBeenCalledOnce();
  });
});
