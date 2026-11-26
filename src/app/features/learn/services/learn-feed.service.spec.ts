// @vitest-environment jsdom

import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { LocalDBService } from '../../../shared/local-db/local-db.service';
import { ConfigService } from '../../../core/services/config/config.service';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';
import { IndexRepository } from '../../domain/index/services/index-repository';
import { ConceptRepository } from '../../domain/concepts/services/concepts-repository';
import { QuestionRepository } from '../../domain/questions/services/questions-repository';
import { LearnFeedService, type LearnFeedEntry } from './learn-feed.service';

describe('LearnFeedService', () => {
  let quoteRows: Record<string, unknown>[];
  let conceptRows: Record<string, unknown>[];
  let characterRows: Record<string, unknown>[];
  let characterRelationRows: Record<string, unknown>[];
  let conceptRelationRows: Record<string, unknown>[];
  let indexRows: Record<string, unknown>[];
  let questionRows: Record<string, unknown>[];
  let remoteEnabled: boolean;
  let fetchIndex: ReturnType<typeof vi.fn>;
  let fetchConcept: ReturnType<typeof vi.fn>;
  let fetchQuestion: ReturnType<typeof vi.fn>;
  let updateDomainRow: Mock<
    (
      name: string,
      key: [string, string],
      changes: { lastSeen: Date; interval: number },
    ) => Promise<number>
  >;

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
    questionRows = [];
    remoteEnabled = false;
    fetchIndex = vi.fn(async () => {
      indexRows.push({ id: 'remote', bookId: 'book-001', theme: 'Remote entry', tags: [] });
      return [];
    });
    fetchQuestion = vi.fn();
    fetchConcept = vi.fn(async () => {
      conceptRows.push({ id: 'remote', bookId: 'book-001', term: 'Remote entry', tags: [] });
      return [];
    });
    updateDomainRow = vi.fn(async (_name, _key, _changes) => 1);

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
                update: (
                  key: [string, string],
                  changes: { lastSeen: Date; interval: number },
                ) =>
                  updateDomainRow(name, key, changes),
                where: () => ({ equals: () => ({
                  filter: (predicate: (row: Record<string, unknown>) => boolean) => ({
                    count: async () => name === 'concepts' ? conceptRows.filter(predicate).length : 0,
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
              questions: { toArray: vi.fn(async () => questionRows) },
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            isLocalSampleDataEnabled: () => false,
            getFeedMaxIntervalDays: () => 32,
          },
        },
        { provide: GoogleAuthService, useValue: { idToken: () => remoteEnabled ? 'token' : null } },
        { provide: IndexRepository, useValue: { getDomain: fetchIndex } },
        { provide: QuestionRepository, useValue: { getDomain: fetchQuestion } },
        { provide: ConceptRepository, useValue: { getDomain: fetchConcept } },
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

  it('records lastSeen for feed entries when they are shown', async () => {
    const entry: LearnFeedEntry = {
      id: 'quote-entry',
      domain: 'QUOTES' as const,
      bookName: 'Book One',
      bookAuthor: 'Author One',
      title: 'Quote',
      body: 'Analysis',
      tags: [],
      sourceRow: { id: 'quote-1', bookId: 'book-001' },
    };

    await TestBed.inject(LearnFeedService).markAsShown([entry]);

    const lastSeen = entry.sourceRow['lastSeen'];
    expect(lastSeen).toBeInstanceOf(Date);
    expect(entry.sourceRow['interval']).toBe(1);
    expect(updateDomainRow).toHaveBeenCalledWith('quotes', ['book-001', 'quote-1'], {
      lastSeen,
      interval: 1,
    });
  });

  it('doubles an overdue interval when the item was not reviewed since it was last shown', async () => {
    const entry: LearnFeedEntry = {
      id: 'quote-entry',
      domain: 'QUOTES',
      bookName: 'Book One',
      bookAuthor: 'Author One',
      title: 'Quote',
      body: 'Analysis',
      tags: [],
      sourceRow: {
        id: 'quote-1',
        bookId: 'book-001',
        interval: 4,
        lastSeen: new Date('2026-01-01T00:00:00.000Z'),
      },
    };

    await TestBed.inject(LearnFeedService).markAsShown([entry]);

    expect(entry.sourceRow['interval']).toBe(8);
    expect(updateDomainRow).toHaveBeenCalledWith(
      'quotes',
      ['book-001', 'quote-1'],
      expect.objectContaining({ interval: 8, lastSeen: expect.any(Date) }),
    );
  });

  it('does not auto-double an overdue interval after the item was reviewed', async () => {
    const lastSeen = new Date('2026-01-01T00:00:00.000Z');
    const entry: LearnFeedEntry = {
      id: 'quote-entry',
      domain: 'QUOTES',
      bookName: 'Book One',
      bookAuthor: 'Author One',
      title: 'Quote',
      body: 'Analysis',
      tags: [],
      sourceRow: {
        id: 'quote-1',
        bookId: 'book-001',
        interval: 4,
        lastSeen,
        lastReview: new Date('2026-01-02T00:00:00.000Z'),
      },
    };

    await TestBed.inject(LearnFeedService).markAsShown([entry]);

    expect(entry.sourceRow['interval']).toBe(4);
    expect(updateDomainRow).toHaveBeenCalledWith(
      'quotes',
      ['book-001', 'quote-1'],
      expect.objectContaining({ interval: 4, lastSeen: expect.any(Date) }),
    );
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

  it('excludes index and question entries from local batches and searches', async () => {
    indexRows = [{ id: 'index-1', bookId: 'book-001', theme: 'Excluded item' }];
    questionRows = [{ id: 'question-1', bookId: 'book-001', question: 'Excluded item' }];
    const service = TestBed.inject(LearnFeedService);
    expect(await service.loadRandomBatch(new Set(), 100, 'Excluded item')).toEqual([]);
    expect(await service.loadRandomBatch(new Set(), 100)).toHaveLength(21);
  });

  it('loads eligible remote domains without fetching indexes or questions', async () => {
    quoteRows = [];
    remoteEnabled = true;
    const batch = await TestBed.inject(LearnFeedService).loadRemoteBatch(new Set(), 1);
    expect(fetchConcept).toHaveBeenCalledWith(1);
    expect(fetchIndex).not.toHaveBeenCalled();
    expect(fetchQuestion).not.toHaveBeenCalled();
    expect(batch[0]).toMatchObject({ domain: 'CONCEPTS', title: 'Remote entry' });
  });

  it('does not refresh a domain with pending local changes', async () => {
    quoteRows = [];
    conceptRows = [{ id: 'pending', bookId: 'book-001', term: 'Local edit', syncStatus: 'pending' }];
    remoteEnabled = true;
    await TestBed.inject(LearnFeedService).loadRemoteBatch(new Set(), 1, 'not found');
    expect(fetchConcept).not.toHaveBeenCalled();
  });

});
