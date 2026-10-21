import { describe, expect, it } from 'vitest';
import { normalizeTags, parseTags, serializeTags } from './tag-utils';

describe('tag utilities', () => {
  it('parses array-valued hashtags and ignores non-array tag values', () => {
    expect(parseTags(['#tag1', '#tag2'])).toEqual(['#tag1', '#tag2']);
    expect(parseTags(['#tag1, #tag2; #tag3'])).toEqual(['#tag1', '#tag2', '#tag3']);
    expect(parseTags('#tag1 #tag2')).toEqual([]);
  });

  it('accepts string arrays and serializes them as a canonical tag array', () => {
    expect(normalizeTags(['Tag1', '#tag2', '#TAG1'])).toEqual(['#tag1', '#tag2']);
    expect(serializeTags(['Tag1', '#tag2', '#TAG1'])).toEqual(['#tag1', '#tag2']);
  });

  it('treats empty and non-string inputs as no tags', () => {
    expect(parseTags(undefined)).toEqual([]);
    expect(parseTags([null, undefined])).toEqual([]);
    expect(serializeTags([])).toEqual([]);
  });
});