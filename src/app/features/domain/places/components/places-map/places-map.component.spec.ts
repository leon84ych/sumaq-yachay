import { describe, expect, it } from 'vitest';
import { parsePlaceCoordinates } from './places-map.component';

describe('parsePlaceCoordinates', () => {
  it('parses valid latitude and longitude pairs', () => {
    expect(parsePlaceCoordinates('  -12.04, -77.03 ')).toEqual([-12.04, -77.03]);
  });

  it('rejects malformed, non-finite, and out-of-range coordinates', () => {
    expect(parsePlaceCoordinates(undefined)).toBeNull();
    expect(parsePlaceCoordinates('12; 45')).toBeNull();
    expect(parsePlaceCoordinates('91, 0')).toBeNull();
    expect(parsePlaceCoordinates('0, 181')).toBeNull();
  });
});
