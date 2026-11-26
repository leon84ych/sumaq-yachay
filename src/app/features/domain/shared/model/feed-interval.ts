const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export const INITIAL_FEED_INTERVAL_DAYS = 1;

export function isPowerOfTwoInterval(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    Number.isInteger(Math.log2(value))
  );
}

export function normalizeFeedInterval(value: unknown, maximum: number): number {
  if (!isPowerOfTwoInterval(maximum)) {
    throw new RangeError('The maximum feed interval must be a positive power of two.');
  }

  const interval = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0;
  let normalized = INITIAL_FEED_INTERVAL_DAYS;
  while (normalized * 2 <= interval && normalized * 2 <= maximum) {
    normalized *= 2;
  }
  return normalized;
}

export function isFeedIntervalDue(lastSeen: Date | null, interval: number, now: Date): boolean {
  return lastSeen === null || now.getTime() - lastSeen.getTime() >= interval * DAY_IN_MILLISECONDS;
}

export function toFeedDate(value: unknown): Date | null {
  const date = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}
