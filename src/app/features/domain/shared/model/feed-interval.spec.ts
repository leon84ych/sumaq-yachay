import { describe, expect, it } from 'vitest';
import {
  INITIAL_FEED_INTERVAL_DAYS,
  isFeedIntervalDue,
  normalizeFeedInterval,
  toFeedDate,
} from './feed-interval';

describe('feed interval helpers', () => {
  it('normalizes missing and non-power-of-two intervals to a supported power of two', () => {
    expect(normalizeFeedInterval(undefined, 32)).toBe(INITIAL_FEED_INTERVAL_DAYS);
    expect(normalizeFeedInterval(3, 32)).toBe(2);
    expect(normalizeFeedInterval(64, 32)).toBe(32);
  });

  it('considers unseen and elapsed entries due', () => {
    const now = new Date('2026-11-26T12:00:00.000Z');

    expect(isFeedIntervalDue(null, 1, now)).toBe(true);
    expect(isFeedIntervalDue(new Date('2026-11-25T12:00:00.000Z'), 1, now)).toBe(true);
    expect(isFeedIntervalDue(new Date('2026-11-26T00:00:00.000Z'), 1, now)).toBe(false);
  });

  it('parses valid stored dates and rejects invalid values', () => {
    expect(toFeedDate('2026-11-26T12:00:00.000Z')).toEqual(new Date('2026-11-26T12:00:00.000Z'));
    expect(toFeedDate('not a date')).toBeNull();
    expect(toFeedDate(123)).toBeNull();
  });
});
