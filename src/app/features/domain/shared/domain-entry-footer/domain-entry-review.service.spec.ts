// @vitest-environment jsdom

import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { DomainEntryReviewService } from './domain-entry-review.service';

describe('DomainEntryReviewService', () => {
  let updateRecord: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    updateRecord = vi.fn().mockResolvedValue(1);
    TestBed.configureTestingModule({
      providers: [
        DomainEntryReviewService,
        {
          provide: LocalDBService,
          useValue: {
            indexedDB: {
              table: vi.fn(() => ({ update: updateRecord })),
            },
          },
        },
      ],
    });
  });

  it('starts a missing outcome count at one and persists it', async () => {
    const record: Record<string, unknown> = { id: 'entry-1', bookId: 'book-1' };

    await expect(
      TestBed.inject(DomainEntryReviewService).incrementReviewCount(
        { domain: 'CONCEPTS', record },
        'forgotten',
      ),
    ).resolves.toBe(1);

    expect(updateRecord).toHaveBeenCalledWith(
      ['book-1', 'entry-1'],
      expect.objectContaining({
        forgotten: 1,
        interval: 1,
        lastReview: expect.any(Date),
      }),
    );
    expect(record['forgotten']).toBe(1);
    expect(record['interval']).toBe(1);
    expect(record['lastReview']).toBeInstanceOf(Date);
  });

  it('increments an existing recalled count', async () => {
    const record: Record<string, unknown> = {
      id: 'entry-1',
      bookId: 'book-1',
      recalled: 2,
    };

    await TestBed.inject(DomainEntryReviewService).incrementReviewCount(
      { domain: 'QUOTES', record },
      'recalled',
    );

    expect(updateRecord).toHaveBeenCalledWith(
      ['book-1', 'entry-1'],
      expect.objectContaining({
        recalled: 3,
        interval: 2,
        lastReview: expect.any(Date),
      }),
    );
    expect(record['interval']).toBe(2);
  });

  it('halves a forgotten interval and keeps it at a one-day minimum', async () => {
    const record: Record<string, unknown> = {
      id: 'entry-1',
      bookId: 'book-1',
      interval: 8,
    };

    await TestBed.inject(DomainEntryReviewService).incrementReviewCount(
      { domain: 'QUOTES', record },
      'forgotten',
    );

    expect(record['interval']).toBe(4);
    expect(updateRecord).toHaveBeenCalledWith(
      ['book-1', 'entry-1'],
      expect.objectContaining({ forgotten: 1, interval: 4 }),
    );
  });

  it('caps recalled intervals at the configured maximum', async () => {
    const record: Record<string, unknown> = {
      id: 'entry-1',
      bookId: 'book-1',
      interval: 256,
    };

    await TestBed.inject(DomainEntryReviewService).incrementReviewCount(
      { domain: 'QUOTES', record },
      'recalled',
    );

    expect(record['interval']).toBe(256);
  });

  it('does not change the in-memory count when persistence fails', async () => {
    updateRecord.mockResolvedValue(0);
    const record: Record<string, unknown> = {
      id: 'entry-1',
      bookId: 'book-1',
      forgotten: 1,
    };

    await expect(
      TestBed.inject(DomainEntryReviewService).incrementReviewCount(
        { domain: 'PASSAGES', record },
        'forgotten',
      ),
    ).rejects.toThrow('Could not update forgotten count for feed record entry-1.');

    expect(record['forgotten']).toBe(1);
  });
});
