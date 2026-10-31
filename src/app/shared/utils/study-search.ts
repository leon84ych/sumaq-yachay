import { normalizeTagsFromArray } from './tag-utils';

export type StudySearchField = 'book' | 'author' | 'contributor';

export interface StudySearch {
  text: string;
  tags: string[];
  phrases?: string[];
  contexts?: { field: StudySearchField; value: string }[];
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function parseStudySearch(query: string): StudySearch {
  const tags: string[] = [];
  const phrases: string[] = [];
  const contexts: NonNullable<StudySearch['contexts']> = [];
  const unquoted = query.replace(
    /(?:(book|author|contributor):)?("(?:\\.|[^"\\])*")/gi,
    (_match, field: string | undefined, quoted: string) => {
      try {
        const phrase = normalizeText(JSON.parse(quoted));
        if (phrase) {
          if (field)
            contexts.push({ field: field.toLocaleLowerCase() as StudySearchField, value: phrase });
          else phrases.push(phrase);
        }
        return ' ';
      } catch {
        return _match;
      }
    },
  );
  const text = unquoted.replace(/(?:^|\s)(#[^\s]+)/g, (_match, tag: string) => {
    tags.push(tag);
    return ' ';
  });
  return {
    text: normalizeText(text.replace(/\s+/g, ' ')),
    tags: normalizeTagsFromArray(tags).map(normalizeText),
    ...(phrases.length ? { phrases: [...new Set(phrases)] } : {}),
    ...(contexts.length ? { contexts } : {}),
  };
}

export function matchesStudySearch(
  query: string | StudySearch,
  fields: readonly unknown[],
  tags: unknown,
  context: { book?: unknown; author?: unknown; contributor?: unknown } = {},
): boolean {
  const search = typeof query === 'string' ? parseStudySearch(query) : query;
  const availableTags = new Set(normalizeTagsFromArray(tags).map(normalizeText));
  const searchableFields = [...fields, ...Object.values(context)];
  return (
    (!search.text ||
      searchableFields.some((field) => normalizeText(field).includes(search.text))) &&
    (search.phrases ?? []).every((phrase) =>
      searchableFields.some((field) => normalizeText(field).includes(phrase)),
    ) &&
    (search.contexts ?? []).every(({ field, value }) => normalizeText(context[field]) === value) &&
    search.tags.every((tag) => availableTags.has(tag))
  );
}
