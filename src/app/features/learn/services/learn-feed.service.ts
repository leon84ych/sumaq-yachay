import { Injectable, inject } from '@angular/core';
import { AppDbService } from '../../../core/services/storage/app-db.service';
import { ConfigService } from '../../../core/services/config.service';
import { DomainName } from '../../catalog-detail/models/domain-sheet-config';
import { parseTags } from '../../../shared/utils/tag-utils';
import { matchesStudySearch, parseStudySearch } from '../../../shared/utils/study-search';

export interface LearnFeedEntry {
  id: string;
  domain: DomainName;
  bookName: string;
  bookAuthor: string;
  title: string;
  body: string;
  note?: string;
  tags: string[];
  accentColor?: string;
  sourceRow: Record<string, unknown>;
}

const BATCH_SIZE = 20;
const DOMAIN_SEARCH_TERMS: Record<DomainName, string[]> = {
  INDEX: ['index', 'índice'],
  CONCEPTS: ['concepts', 'conceptos'],
  QUOTES: ['quotes', 'citas'],
  PASSAGES: ['passages', 'pasajes'],
  CHARACTER: ['character', 'characters', 'personaje', 'personajes'],
  PLACES: ['places', 'lugar', 'lugares'],
  BOOK_EVENTS: ['book events', 'events', 'eventos'],
  RELATIONS: ['relations', 'relationships', 'relaciones'],
  ASSOCIATIONS: ['associations', 'concept relationships', 'asociaciones'],
  GLOSARY: ['glossary', 'glosario'],
  QUESTIONS: ['questions', 'preguntas'],
};

export function selectLearnFeedBatch(
  entries: readonly LearnFeedEntry[],
  batchSize: number,
): LearnFeedEntry[] {
  const firstEntryByDomain = new Map<DomainName, LearnFeedEntry>();
  const remainingEntries: LearnFeedEntry[] = [];
  for (const entry of entries) {
    if (firstEntryByDomain.has(entry.domain)) {
      remainingEntries.push(entry);
    } else {
      firstEntryByDomain.set(entry.domain, entry);
    }
  }

  return [...firstEntryByDomain.values(), ...remainingEntries].slice(
    0,
    Math.max(0, batchSize),
  );
}

@Injectable({ providedIn: 'root' })
export class LearnFeedService {
  private readonly appDbService = inject(AppDbService);
  private readonly configService = inject(ConfigService);
  private sampleDataSeeded = false;

  async loadRandomBatch(
    excludedIds: ReadonlySet<string>,
    batchSize = BATCH_SIZE,
    query = '',
  ): Promise<LearnFeedEntry[]> {
    if (this.configService.isLocalSampleDataEnabled() && !this.sampleDataSeeded) {
      await this.appDbService.seedLocalSampleData();
      this.sampleDataSeeded = true;
    }

    const [catalogItems, domainRows] = await Promise.all([
      this.appDbService.db.catalogs.toArray(),
      Promise.all([
        this.appDbService.db.concepts.toArray().then((rows) => ['CONCEPTS', rows] as const),
        this.appDbService.db.quotes.toArray().then((rows) => ['QUOTES', rows] as const),
        this.appDbService.db.passages.toArray().then((rows) => ['PASSAGES', rows] as const),
        this.appDbService.db.characters.toArray().then((rows) => ['CHARACTER', rows] as const),
        this.appDbService.db.places.toArray().then((rows) => ['PLACES', rows] as const),
        this.appDbService.db.relationsCharacters
          .toArray()
          .then((rows) => ['RELATIONS', rows] as const),
        this.appDbService.db.relationsConcepts
          .toArray()
          .then((rows) => ['ASSOCIATIONS', rows] as const),
        this.appDbService.db.glosary.toArray().then((rows) => ['GLOSARY', rows] as const),
        this.appDbService.db.questions.toArray().then((rows) => ['QUESTIONS', rows] as const),
      ]),
    ]);

    const catalogByRow = new Map(catalogItems.map((item) => [item.row, item]));
    const characterNames = new Map<string, string>();
    const conceptNames = new Map<string, string>();
    for (const [domain, rows] of domainRows) {
      if (domain === 'CHARACTER') {
        for (const row of rows as unknown as Record<string, unknown>[]) {
          characterNames.set(String(row['id']), String(row['name'] ?? row['id']));
        }
      } else if (domain === 'CONCEPTS') {
        for (const row of rows as unknown as Record<string, unknown>[]) {
          conceptNames.set(String(row['id']), String(row['term'] ?? row['id']));
        }
      }
    }
    const candidates: LearnFeedEntry[] = [];
    const search = parseStudySearch(query);

    for (const [domain, rows] of domainRows) {
      for (const sourceRow of rows as unknown as Record<string, unknown>[]) {
        const catalogItem = catalogByRow.get(Number(sourceRow['row']));
        if (!catalogItem) {
          continue;
        }

        const entry = this.toLearnFeedEntry(
          domain,
          sourceRow,
          catalogItem.name,
          catalogItem.author,
          characterNames,
          conceptNames,
        );
        const searchFields = entry
          ? [
              entry.bookName,
              entry.bookAuthor,
              entry.title,
              entry.body,
              entry.note ?? '',
              ...DOMAIN_SEARCH_TERMS[entry.domain],
              ...entry.tags,
            ]
          : [];
        const matchesQuery = matchesStudySearch(search, searchFields, entry?.tags, {
          book: entry?.bookName, author: entry?.bookAuthor,
          contributor: entry?.sourceRow['contributor'],
        });

        if (entry && !excludedIds.has(entry.id) && matchesQuery) {
          candidates.push(entry);
        }
      }
    }

    this.shuffle(candidates);
    return selectLearnFeedBatch(candidates, batchSize);
  }

  private toLearnFeedEntry(
    domain: DomainName,
    row: Record<string, unknown>,
    bookName: string,
    bookAuthor: string,
    characterNames: ReadonlyMap<string, string>,
    conceptNames: ReadonlyMap<string, string>,
  ): LearnFeedEntry | null {
    const getText = (key: string): string => {
      const value = row[key];
      return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    };

    let title = '';
    let body = '';
    let note = '';

    switch (domain) {
      case 'CONCEPTS':
        title = getText('term');
        body = getText('definition');
        note = getText('category');
        break;
      case 'QUOTES':
        title = getText('quote');
        body = getText('analysis');
        note = getText('author');
        break;
      case 'PASSAGES':
        title = getText('title');
        body = getText('passageText');
        note = getText('page');
        break;
      case 'CHARACTER':
        title = getText('name');
        body = getText('description');
        note = [getText('role'), getText('archetype')].filter(Boolean).join(' · ');
        break;
      case 'PLACES':
        title = getText('name');
        body = getText('description');
        note = [getText('type'), getText('nature')].filter(Boolean).join(' · ');
        break;
      case 'BOOK_EVENTS':
        title = getText('event');
        body = getText('description');
        note = getText('dateLabel') || getText('dateTimeStart') || getText('eventOrder');
        break;
      case 'RELATIONS':
        title = [getText('sourceCharacterId'), getText('targetCharacterId')]
          .map((id) => characterNames.get(id) ?? id)
          .filter(Boolean)
          .join(' -> ');
        body = [getText('relationType'), getText('description')].filter(Boolean).join('\n\n');
        break;
      case 'ASSOCIATIONS':
        title = [getText('sourceConceptId'), getText('targetConceptId')]
          .map((id) => conceptNames.get(id) ?? id)
          .filter(Boolean)
          .join(' -> ');
        body = [getText('relationType'), getText('description')].filter(Boolean).join('\n\n');
        break;
      case 'GLOSARY':
        title = getText('term');
        body = getText('definition');
        note = [getText('partOfSpeech'), getText('contextSentence')].filter(Boolean).join(' · ');
        break;
      case 'QUESTIONS':
        title = getText('question');
        body = getText('answer');
        note = getText('difficulty');
        break;
    }

    if (!title && !body) {
      return null;
    }

    const tags = [...new Set(parseTags(row['tags']))];
    const accentColor = typeof row['color'] === 'string' ? row['color'] : undefined;

    return {
      id: `${domain}:${String(row['row'])}:${String(row['id'])}`,
      domain,
      bookName,
      bookAuthor,
      title,
      body,
      ...(note ? { note } : {}),
      tags,
      ...(accentColor ? { accentColor } : {}),
      sourceRow: row,
    };
  }

  private shuffle(entries: LearnFeedEntry[]): void {
    for (let index = entries.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [entries[index], entries[swapIndex]] = [entries[swapIndex], entries[index]];
    }
  }
}
