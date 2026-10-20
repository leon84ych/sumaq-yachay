import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppDbService } from '../../../core/services/storage/app-db.service';
import { ConfigService } from '../../../core/services/config.service';
import { LearnFeedService } from './learn-feed.service';

describe('LearnFeedService', () => {
  let localSampleDataEnabled: boolean;
  let seedLocalSampleData: ReturnType<typeof vi.fn>;
  let quoteRows: Record<string, unknown>[];

  beforeEach(() => {
    TestBed.resetTestingModule();
    localSampleDataEnabled = false;
    seedLocalSampleData = vi.fn().mockResolvedValue(undefined);
    quoteRows = Array.from({ length: 21 }, (_, index) => ({
      id: `quote-${index + 1}`,
      row: 1,
      quote: `Quote ${index + 1}`,
      analysis: `Analysis ${index + 1}`,
      tags: '#sample',
    }));

    const emptyTable = { toArray: vi.fn().mockResolvedValue([]) };
    TestBed.configureTestingModule({
      providers: [
        LearnFeedService,
        {
          provide: AppDbService,
          useValue: {
            seedLocalSampleData,
            db: {
              catalogs: { toArray: vi.fn().mockResolvedValue([{ id: 'book-001', row: 1, name: 'Book One', author: 'Author One' }]) },
              indexTopics: emptyTable,
              concepts: emptyTable,
              quotes: { toArray: vi.fn().mockImplementation(async () => quoteRows) },
              passages: emptyTable,
              characters: emptyTable,
              places: emptyTable,
              timeline: emptyTable,
              relations: emptyTable,
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

  it('seeds local sample fixtures before reading when LocalSampleData is enabled', async () => {
    localSampleDataEnabled = true;

    await TestBed.inject(LearnFeedService).loadRandomBatch(new Set());

    expect(seedLocalSampleData).toHaveBeenCalledOnce();
  });
});
