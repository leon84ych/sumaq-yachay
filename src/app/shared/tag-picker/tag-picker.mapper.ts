

/**
 * Converts pipe-delimited Google Sheets tags into an array.
 * @param rawTags Google Sheets tags format: tag1|tag2|tag3.
 * @returns An array of tags.
 * @example Input: 'tag1|tag2|tag3' -> Output: ['tag1', 'tag2', 'tag3']
 */
export function mapTagsToArray(rawTags: string): string[] {
  if (!rawTags) return [];

  return rawTags
    .split('|')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}


/**
 * Converts an array of tags into the pipe-delimited Google Sheets format.
 * @param tags An array of tags.
 * @returns Pipe-delimited tags.
 * @example Input: ['tag1', 'tag2', 'tag3'] -> Output: 'tag1|tag2|tag3'
 */
export function mapTagsToString(tags: string[]): string {
  if (!tags || tags.length === 0) return '';

  const cleaned = tags
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);

  if (cleaned.length === 0) return '';

  return  cleaned.join('|');
}


/**
 * Parses array tags, then lowercases, prefixes with '#', and removes duplicates.
 * @param value A value expected to contain an array of tags.
 * @returns Normalized, unique tags.
 * @example Input: ['Tag1', '#TAG2', 'tag1'] -> Output: ['#tag1', '#tag2']
 */
export function normalizeTagsFromArray(value: unknown): string[] {
  return [...new Set(
    parseTagsFromArray(value)
      .map((tag) => tag.replace(/^#+/, '').toLocaleLowerCase())
      .filter(Boolean)
      .map((tag) => `#${tag}`),
  )];
}

/**
 * Parses string elements in an array, splitting each on whitespace, commas, or semicolons.
 * @param value A value expected to contain an array of tag strings.
 * @returns Parsed tags without normalization.
 * @example Input: ['tag1, tag2', 'tag3'] -> Output: ['tag1', 'tag2', 'tag3']
 */
export function parseTagsFromArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .flatMap((item) => item.split(/[\s,;]+/))
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/**
 * Parses a tag string, splitting it on whitespace, commas, or semicolons.
 * @param value A value expected to be a tag string.
 * @returns Parsed tags without normalization.
 * @example Input: 'tag1, tag2; tag3' -> Output: ['tag1', 'tag2', 'tag3']
 */
export function parseTagsFromString(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }
  return (value as string)
    .split(/[\s,;]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}
/**
 * Parses a tag string, then lowercases, prefixes with '#', and removes duplicates.
 * @param value A value expected to be a tag string.
 * @returns Normalized, unique tags.
 * @example Input: 'Tag1, #TAG2; tag1' -> Output: ['#tag1', '#tag2']
 */
export function normalizeTagsFromString(value: unknown): string[] {
  return [...new Set(
    parseTagsFromString(value)
      .map((tag) => tag.replace(/^#+/, '').toLocaleLowerCase())
      .filter(Boolean)
      .map((tag) => `#${tag}`),
  )];
}
