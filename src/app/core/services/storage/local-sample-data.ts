import { CatalogItem } from '../../../features/catalog/models/catalog-item.model';
import catalogItems from '../../../../../public/sample/Catalog.json';
import { serializeTags } from '../../../shared/utils/tag-utils';

export const LOCAL_SAMPLE_CATALOG: CatalogItem[] = catalogItems.map((item, index) => ({
  ...item,
  row: index + 1,
  syncStatus: 'synced',
}));

export const LOCAL_SAMPLE_DOMAIN_TABLES: Record<string, string> = {
  INDEX: 'indexTopics',
  CONCEPTS: 'concepts',
  QUOTES: 'quotes',
  PASSAGES: 'passages',
  CHARACTER: 'characters',
  PLACES: 'places',
  BOOK_EVENTS: 'bookEvents',
  RELATIONS_CHARACTERS: 'relationsCharacters',
  RELATIONS_CONCEPTS: 'relationsConcepts',
  GLOSARY: 'glosary',
  QUESTIONS: 'questions',
};

type LocalSampleDomainData = Record<string, Record<string, unknown>[]>;

const EMPTY_LOCAL_SAMPLE_DOMAIN_DATA = Object.fromEntries(
  Object.keys(LOCAL_SAMPLE_DOMAIN_TABLES).map((domain) => [domain, []]),
) as LocalSampleDomainData;

const LOCAL_SAMPLE_DOMAIN_DATA_LOADERS: Record<
  string,
  () => Promise<{ default: LocalSampleDomainData }>
> = {
  'book-001': () => import('../../../../../public/sample/book-001.json'),
  'book-002': () => import('../../../../../public/sample/book-002.json'),
  'book-003': () => import('../../../../../public/sample/book-003.json'),
  'book-004': () => import('../../../../../public/sample/book-004.json'),
  'book-005': () => import('../../../../../public/sample/book-005.json'),
  'book-006': () => import('../../../../../public/sample/book-006.json'),
  'book-007': () => import('../../../../../public/sample/book-007.json'),
  'book-008': () => import('../../../../../public/sample/book-008.json'),
  'book-009': () => import('../../../../../public/sample/book-009.json'),
  'book-010': () => import('../../../../../public/sample/book-010.json'),
  'book-es-001': () => import('../../../../../public/sample/book-es-001.json'),
  'book-es-002': () => import('../../../../../public/sample/book-es-002.json'),
  'book-es-003': () => import('../../../../../public/sample/book-es-003.json'),
  'book-es-004': () => import('../../../../../public/sample/book-es-004.json'),
  'book-es-005': () => import('../../../../../public/sample/book-es-005.json'),
  'book-es-006': () => import('../../../../../public/sample/book-es-006.json'),
  'book-es-007': () => import('../../../../../public/sample/book-es-007.json'),
  'book-es-008': () => import('../../../../../public/sample/book-es-008.json'),
  'book-es-009': () => import('../../../../../public/sample/book-es-009.json'),
  'book-es-010': () => import('../../../../../public/sample/book-es-010.json'),
};

export async function getLocalSampleDomainData(bookId: string): Promise<LocalSampleDomainData> {
  const loadDomainData = LOCAL_SAMPLE_DOMAIN_DATA_LOADERS[bookId];
  if (!loadDomainData) {
    return EMPTY_LOCAL_SAMPLE_DOMAIN_DATA;
  }

  const module = await loadDomainData();
  return { ...EMPTY_LOCAL_SAMPLE_DOMAIN_DATA, ...module.default };
}

export function normalizeSampleDomainRow(row: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...row };
  normalized['tags'] = serializeTags(normalized['tags']);

  if (Array.isArray(normalized['synonyms'])) {
    normalized['synonyms'] = normalized['synonyms']
      .map((synonym) => String(synonym).trim())
      .filter(Boolean)
      .join(', ');
  }

  return normalized;
}
