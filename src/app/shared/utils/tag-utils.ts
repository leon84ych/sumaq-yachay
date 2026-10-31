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

export function parseTagsFromString(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }
  return (value as string)
    .split(/[\s,;]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function normalizeTagsFromArray(value: unknown): string[] {
  return [...new Set(
    parseTagsFromArray(value)
      .map((tag) => tag.replace(/^#+/, '').toLocaleLowerCase())
      .filter(Boolean)
      .map((tag) => `#${tag}`),
  )];
}

export function normalizeTagsFromString(value: unknown): string[] {
  return [...new Set(
    parseTagsFromString(value)
      .map((tag) => tag.replace(/^#+/, '').toLocaleLowerCase())
      .filter(Boolean)
      .map((tag) => `#${tag}`),
  )];
}

export function serializeTagsToArray(value: unknown): string[] {
  return normalizeTagsFromArray(value);
}

export function serializeTagsToString(value: unknown): string {
  return normalizeTagsFromString(value).join(', ');
}


/**
 * Deserialize tags from GAS Sheets  
 * @param value The string containing tags separated by '|'
 * @returns #one, #two,#tree
 */
export function deserializeTagsFromBE(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }
  return value.split('|').map(tag => tag.trim()).filter(tag => tag);
}

export function serializeTagsToBE(value: unknown): string {
  if (!Array.isArray(value)) {
    return '';
  }
  return value.map(tag => tag.replace(/^#+/, '').toLocaleLowerCase()).filter(Boolean).join('|');
}


/**
 * 
 * @param tagsValue 
 * @returns 
 */
export function parseTagsFromPipeStringToArray(tagsValue: unknown): string[] {
  if (typeof tagsValue !== 'string' || !tagsValue.trim()) {
    return [];
  }
  return tagsValue
    .split('|')
    .map(tag => tag.trim().replace(/^#/, '')) // Remueve el '#' inicial y espacios
    .filter(tag => tag.length > 0);
}