import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDomainId } from './domain-shared-model';

describe('createDomainId', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses the book, domain and millisecond timestamp', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);

    expect(createDomainId('book-1', 'BOOK_EVENTS')).toBe('book-1_BOOK_EVENTS_1800000000000');
  });

  it('does not reuse a timestamp within the same application instance', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_900_000_000_000);

    expect(createDomainId('book-1', 'INDEX')).toBe('book-1_INDEX_1900000000000');
    expect(createDomainId('book-1', 'INDEX')).toBe('book-1_INDEX_1900000000001');
  });
});
