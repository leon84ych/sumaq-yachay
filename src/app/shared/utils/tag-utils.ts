



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