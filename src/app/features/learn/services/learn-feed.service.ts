import { Injectable, inject } from '@angular/core';
import { AppDbService } from '../../../core/services/storage/app-db.service';
import { ConfigService } from '../../../core/services/config.service';
import { DomainName } from '../../catalog-detail/models/domain-sheet-config';

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

@Injectable({ providedIn: 'root' })
export class LearnFeedService {
  private readonly appDbService = inject(AppDbService);
  private readonly configService = inject(ConfigService);
  private sampleDataSeeded = false;

  async loadRandomBatch(
    excludedIds: ReadonlySet<string>,
    batchSize = BATCH_SIZE,
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
        this.appDbService.db.timeline.toArray().then((rows) => ['TIMELINE', rows] as const),
        this.appDbService.db.relations.toArray().then((rows) => ['RELATIONS', rows] as const),
        this.appDbService.db.glosary.toArray().then((rows) => ['GLOSARY', rows] as const),
        this.appDbService.db.questions.toArray().then((rows) => ['QUESTIONS', rows] as const),
      ]),
    ]);

    const catalogByRow = new Map(catalogItems.map((item) => [item.row, item]));
    const candidates: LearnFeedEntry[] = [];

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
        );
        if (entry && !excludedIds.has(entry.id)) {
          candidates.push(entry);
        }
      }
    }

    this.shuffle(candidates);
    return candidates.slice(0, Math.max(0, batchSize));
  }

  private toLearnFeedEntry(
    domain: DomainName,
    row: Record<string, unknown>,
    bookName: string,
    bookAuthor: string,
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
      case 'TIMELINE':
        title = getText('event');
        body = getText('description');
        note = getText('date');
        break;
      case 'RELATIONS':
        title = [getText('sourceNode'), getText('targetNode')].filter(Boolean).join(' → ');
        body = getText('relationshipType');
        note = getText('weight');
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

    const rawTags = [row['tag'], row['tags']].flatMap((value) =>
      Array.isArray(value)
        ? value.map(String)
        : typeof value === 'string'
          ? value.split(/[\s,;]+/)
          : [],
    );
    const tags = [...new Set(rawTags.map((tag) => tag.trim()).filter(Boolean))];
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
