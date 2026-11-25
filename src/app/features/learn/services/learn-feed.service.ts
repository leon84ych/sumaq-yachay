import { Injectable, Injector, inject } from '@angular/core';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';
import { LocalDBService } from '../../../shared/local-db/local-db.service';
import { ConfigService } from '../../../core/services/config/config.service';
import { DomainName } from '../../domain-1/book-detail/models/domain-sheet-config';
import { matchesStudySearch, parseStudySearch } from '../../../shared/utils/study-search';
import { parseTagsFromArray } from '../../../shared/tag-picker/tag-picker.mapper';
import { IndexRepository } from '../../domain-1/index/services/index-repository';
import { ConceptRepository } from '../../domain-1/concepts/services/concepts-repository';
import { QuoteRepository } from '../../domain-1/quotes/services/quotes-repository';
import { PassageRepository } from '../../domain-1/passages/services/passages-repository';
import { CharacterRepository } from '../../domain-1/characters/services/characters-repository';
import { PlaceRepository } from '../../domain-1/places/services/places-repository';
import { BookEventRepository } from '../../domain-1/book-events/services/book-events-repository';
import { RelationRepository } from '../../domain-1/relations/services/relations-repository';
import { AssociationRepository } from '../../domain-1/associations/services/associations-repository';
import { GlossaryRepository } from '../../domain-1/glossary/services/glossary-repository';
import { QuestionRepository } from '../../domain-1/questions/services/questions-repository';

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
const DOMAIN_REPOSITORIES = [IndexRepository, ConceptRepository, QuoteRepository,
  PassageRepository, CharacterRepository, PlaceRepository, BookEventRepository,
  RelationRepository, AssociationRepository, GlossaryRepository, QuestionRepository] as const;
const DOMAIN_TABLES = ['indexes', 'concepts', 'quotes', 'passages', 'characters', 'places',
  'bookEvents', 'relations', 'associations', 'glossary', 'questions'] as const;
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
  private readonly localDBService = inject(LocalDBService);
  private readonly configService = inject(ConfigService);
  private readonly injector = inject(Injector);
  private readonly authService = inject(GoogleAuthService);
  private remoteExhausted = false;
  private readonly remoteFetched = new Set<string>();

  canFetchRemote(): boolean {
    return (
      !this.configService.isLocalSampleDataEnabled() &&
      !!this.authService.idToken() &&
      !this.remoteExhausted
    );
  }

  async loadRemoteBatch(
    excludedIds: ReadonlySet<string>,
    batchSize = BATCH_SIZE,
    query = '',
  ): Promise<LearnFeedEntry[]> {
    let batch = await this.loadRandomBatch(excludedIds, batchSize, query);
    if (!this.canFetchRemote()) {
      return batch;
    }

    const books = await this.localDBService.indexedDB.books.toArray();
    for (const book of books) {
      for (const [domainIndex, repositoryType] of DOMAIN_REPOSITORIES.entries()) {
        if (batch.length >= batchSize) break;
        const key = JSON.stringify([book.id, domainIndex]);
        if (this.remoteFetched.has(key)) continue;
        this.remoteFetched.add(key);
        try {
          const table = this.localDBService.indexedDB.table(DOMAIN_TABLES[domainIndex]);
          const hasUnsynced = await table.where('bookId').equals(book.id)
            .filter((record: { syncStatus?: string }) => record.syncStatus === 'pending' || record.syncStatus === 'error')
            .count();
          if (hasUnsynced) continue;
          const repository = this.injector.get(repositoryType as typeof IndexRepository);
          await repository.getDomain(book.row);
          batch = await this.loadRandomBatch(excludedIds, batchSize, query);
        } catch {
          continue;
        }
      }
    }

    if (batch.length < batchSize) {
      this.remoteExhausted = true;
    }
    return batch;
  }

  async loadRandomBatch(
    excludedIds: ReadonlySet<string>,
    batchSize = BATCH_SIZE,
    query = '',
  ): Promise<LearnFeedEntry[]> {
    if (this.configService.isLocalSampleDataEnabled()) await this.localDBService.seedLocalSampleData();
    const db = this.localDBService.indexedDB;
    const [bookItems, domainRows] = await Promise.all([
      db.books.toArray(),
      Promise.all([
        db.indexes.toArray().then((rows) => ['INDEX', rows] as const),
        db.bookEvents.toArray().then((rows) => ['BOOK_EVENTS', rows] as const),
        db.concepts.toArray().then((rows) => ['CONCEPTS', rows] as const),
        db.quotes.toArray().then((rows) => ['QUOTES', rows] as const),
        db.passages.toArray().then((rows) => ['PASSAGES', rows] as const),
        db.characters.toArray().then((rows) => ['CHARACTER', rows] as const),
        db.places.toArray().then((rows) => ['PLACES', rows] as const),
        db.relations
          .toArray()
          .then((rows) => ['RELATIONS', rows] as const),
        db.associations
          .toArray()
          .then((rows) => ['ASSOCIATIONS', rows] as const),
        db.glossary.toArray().then((rows) => ['GLOSARY', rows] as const),
        db.questions.toArray().then((rows) => ['QUESTIONS', rows] as const),
      ]),
    ]);

    const bookById = new Map(bookItems.map((item) => [item.id, item]));
    const characterNames = new Map<string, string>();
    const conceptNames = new Map<string, string>();
    for (const [domain, rows] of domainRows) {
      if (domain === 'CHARACTER') {
        for (const row of rows as unknown as Record<string, unknown>[]) {
          characterNames.set(JSON.stringify([row['bookId'], row['id']]), String(row['name'] ?? row['id']));
        }
      } else if (domain === 'CONCEPTS') {
        for (const row of rows as unknown as Record<string, unknown>[]) {
          conceptNames.set(JSON.stringify([row['bookId'], row['id']]), String(row['term'] ?? row['id']));
        }
      }
    }
    const candidates: LearnFeedEntry[] = [];
    const search = parseStudySearch(query);

    for (const [domain, rows] of domainRows) {
      for (const sourceRow of rows as unknown as Record<string, unknown>[]) {
        const bookRecord = bookById.get(String(sourceRow['bookId']));
        if (!bookRecord) {
          continue;
        }

        const entry = this.toLearnFeedEntry(
          domain,
          sourceRow,
          bookRecord.name,
          bookRecord.author,
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
      case 'INDEX':
        title = getText('theme') || getText('chapter');
        body = getText('subtheme');
        note = getText('chapter');
        break;
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
          .map((id) => characterNames.get(JSON.stringify([row['bookId'], id])) ?? id)
          .filter(Boolean)
          .join(' -> ');
        body = [getText('relationType'), getText('description')].filter(Boolean).join('\n\n');
        break;
      case 'ASSOCIATIONS':
        title = [getText('sourceConceptId'), getText('targetConceptId')]
          .map((id) => conceptNames.get(JSON.stringify([row['bookId'], id])) ?? id)
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

    const tags = [...new Set(parseTagsFromArray(row['tags']))];
    const accentColor = typeof row['color'] === 'string' ? row['color'] : undefined;

    return {
      id: JSON.stringify([domain, row['bookId'], row['id']]),
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
