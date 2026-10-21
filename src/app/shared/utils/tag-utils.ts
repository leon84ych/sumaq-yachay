export function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .flatMap((item) => item.split(/[\s,;]+/))
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function normalizeTags(value: unknown): string[] {
  return [...new Set(
    parseTags(value)
      .map((tag) => tag.replace(/^#+/, '').toLocaleLowerCase())
      .filter(Boolean)
      .map((tag) => `#${tag}`),
  )];
}

export function serializeTags(value: unknown): string[] {
  return normalizeTags(value);
}