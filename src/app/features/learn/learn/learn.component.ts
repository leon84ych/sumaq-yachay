import { NgComponentOutlet } from '@angular/common';
import { Component, inject, signal, Type } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PlaceEntryCardComponent } from '../../domain-places/components/place-entry-card/place-entry-card.component';
import { GlossaryEntryCardComponent } from '../../domain-glosary/components/glossary-entry-card/glossary-entry-card.component';
import { IndexEntryCardComponent } from '../../domain-index/components/index-entry-card/index-entry-card.component';
import { PassageEntryCardComponent } from '../../domain-passages/components/passage-entry-card/passage-entry-card.component';
import { QuoteEntryCardComponent } from '../../domain-quotes/components/quote-entry-card/quote-entry-card.component';
import { CharacterEntryCardComponent } from '../../domain-character/components/character-entry-card/character-entry-card.component';
import { CharacterRow } from '../../domain-character/models/domain-character-row.model';
import { ConceptEntryCardComponent } from '../../domain-concepts/components/concept-entry-card/concept-entry-card.component';
import { ConceptRow } from '../../domain-concepts/model/domain-concept-row.model';
import { GlossaryRow } from '../../domain-glosary/model/domain-glosary-row.model';
import { PlaceRow } from '../../domain-places/model/domain-place-row.model';
import { PassagesRow } from '../../domain-passages/model/domain-passage-row.model';
import { QuoteRow } from '../../domain-quotes/model/domain-quote-row.model';
import { normalizeIndexRows } from '../../domain-index/model/index-view-row';
import { LearnFeedEntryCardComponent } from '../components/learn-feed-entry-card/learn-feed-entry-card.component';
import { LearnFeedEntry, LearnFeedService } from '../services/learn-feed.service';

const BATCH_SIZE = 20;

@Component({
  selector: 'app-learn',
  imports: [TranslocoPipe, NgComponentOutlet],
  templateUrl: './learn.component.html',
  styleUrls: ['./learn.component.css'],
})
export class Learn {
  private readonly learnFeedService = inject(LearnFeedService);
  private readonly seenEntryIds = new Set<string>();

  readonly entries = signal<LearnFeedEntry[]>([]);
  readonly isLoading = signal(false);
  readonly hasMore = signal(true);
  readonly errorMessage = signal<string | null>(null);

  bookRow(entry: LearnFeedEntry): number {
    const row = entry.sourceRow['row'];
    return typeof row === 'number' ? row : 0;
  }

  componentFor(entry: LearnFeedEntry): Type<unknown> {
    switch (entry.domain) {
      case 'CHARACTER':
        return CharacterEntryCardComponent;
      case 'CONCEPTS':
        return ConceptEntryCardComponent;
      case 'GLOSARY':
        return GlossaryEntryCardComponent;
      case 'INDEX':
        return IndexEntryCardComponent;
      case 'PASSAGES':
        return PassageEntryCardComponent;
      case 'PLACES':
        return PlaceEntryCardComponent;
      case 'QUOTES':
        return QuoteEntryCardComponent;
      default:
        return LearnFeedEntryCardComponent;
    }
  }

  componentInputs(entry: LearnFeedEntry): Record<string, unknown> {
    const context = {
      bookName: entry.bookName,
      bookAuthor: entry.bookAuthor,
    };

    switch (entry.domain) {
      case 'CHARACTER':
        return {
          ...context,
          row: entry.sourceRow as unknown as CharacterRow,
          showActions: false,
          showContext: true,
        };
      case 'CONCEPTS':
        return {
          ...context,
          row: entry.sourceRow as unknown as ConceptRow,
          bookRow: this.bookRow(entry),
          sourceDomain: entry.domain,
          showActions: false,
          showContext: true,
        };
      case 'GLOSARY':
        return {
          ...context,
          row: entry.sourceRow as unknown as GlossaryRow,
          showActions: false,
          showContext: true,
        };
      case 'INDEX':
        return {
          ...context,
          row: normalizeIndexRows([entry.sourceRow])[0],
          showActions: false,
          showContext: true,
          showHierarchy: true,
        };
      case 'PASSAGES':
        return {
          ...context,
          row: entry.sourceRow as unknown as PassagesRow,
          showActions: false,
          showReadAction: true,
          showContext: true,
          readerMode: 'internal',
        };
      case 'PLACES':
        return {
          ...context,
          row: entry.sourceRow as unknown as PlaceRow,
          showActions: false,
          showContext: true,
        };
      case 'QUOTES':
        return {
          ...context,
          row: entry.sourceRow as unknown as QuoteRow,
          showActions: false,
        };
      default:
        return { entry };
    }
  }

  constructor() {
    void this.loadMore();
  }

  async loadMore(): Promise<void> {
    if (this.isLoading() || !this.hasMore()) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const batch = await this.learnFeedService.loadRandomBatch(this.seenEntryIds, BATCH_SIZE);
      for (const entry of batch) {
        this.seenEntryIds.add(entry.id);
      }
      this.entries.update((current) => [...current, ...batch]);
      this.hasMore.set(batch.length === BATCH_SIZE);
    } catch {
      this.errorMessage.set('LEARN.ERROR');
    } finally {
      this.isLoading.set(false);
    }
  }
}
