import { NgComponentOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  Type,
  untracked,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { StudySearchService } from '../../../core/services/search/study-search.service';
import { PlaceEntryCardComponent } from '../../domain/places/components/place-entry-card/place-entry-card.component';
import { GlossaryEntryCardComponent } from '../../domain/glossary/components/glossary-entry-card/glossary-entry-card.component';
import { PassageEntryCardComponent } from '../../domain/passages/components/passage-entry-card/passage-entry-card.component';
import { QuoteEntryCardComponent } from '../../domain/quotes/components/quote-entry-card/quote-entry-card.component';
import { CharacterEntryCardComponent } from '../../domain/characters/components/character-entry-card/character-entry-card.component';
import { ConceptEntryCardComponent } from '../../domain/concepts/components/concept-entry-card/concept-entry-card.component';
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly learnFeedService = inject(LearnFeedService);
  private readonly seenEntryIds = new Set<string>();
  private readonly loadMoreTrigger = viewChild<ElementRef<HTMLElement>>('loadMoreTrigger');
  private intersectionObserver: IntersectionObserver | null = null;
  private observedLoadTrigger: HTMLElement | null = null;

  readonly entries = signal<LearnFeedEntry[]>([]);
  readonly searchQuery = inject(StudySearchService).query;
  readonly isLoading = signal(false);
  readonly hasMore = signal(true);
  readonly errorMessage = signal<string | null>(null);
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private requestVersion = 0;

  componentFor(entry: LearnFeedEntry): Type<unknown> {
    switch (entry.domain) {
      case 'CHARACTER':
        return CharacterEntryCardComponent;
      case 'CONCEPTS':
        return ConceptEntryCardComponent;
      case 'GLOSARY':
        return GlossaryEntryCardComponent;
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
          row: entry.sourceRow,
          showActions: false,
          showFeedReview: true,
        };
      case 'CONCEPTS':
        return {
          ...context,
          row: entry.sourceRow,
          sourceDomain: entry.domain,
          showActions: false,
          showFeedReview: true,
          showContext: true,
        };
      case 'GLOSARY':
        return {
          ...context,
          row: entry.sourceRow,
          showActions: false,
          showFeedReview: true,
        };
      case 'PASSAGES':
        return {
          ...context,
          row: entry.sourceRow,
          showActions: false,
          showFeedReview: true,
          showReadAction: true,
          showContext: true,
          readerMode: 'internal',
        };
      case 'PLACES':
        return {
          ...context,
          row: entry.sourceRow,
          showActions: false,
          showFeedReview: true,
          showContext: true,
        };
      case 'QUOTES':
        return {
          ...context,
          row: entry.sourceRow,
          showActions: false,
          showFeedReview: true,
        };
      default:
        return { entry };
    }
  }

  constructor() {
    if (typeof IntersectionObserver !== 'undefined') {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            void this.loadMore();
          }
        },
        { rootMargin: '0px 0px 300px 0px' },
      );
      effect(() => this.observeLoadMoreTrigger());
    }

    this.destroyRef.onDestroy(() => {
      ++this.requestVersion;
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }
      this.intersectionObserver?.disconnect();
    });
    effect(() => {
      const query = this.searchQuery();
      untracked(() => this.scheduleSearch(query));
    });
  }

  onSearchInput(query: string): void {
    this.searchQuery.set(query);
  }

  private observeLoadMoreTrigger(): void {
    const observer = this.intersectionObserver;
    if (!observer) {
      return;
    }

    if (this.observedLoadTrigger) {
      observer.unobserve(this.observedLoadTrigger);
    }

    const trigger = this.loadMoreTrigger()?.nativeElement ?? null;
    this.observedLoadTrigger =
      trigger && this.hasMore() && !this.isLoading() && !this.errorMessage() ? trigger : null;

    if (this.observedLoadTrigger) {
      observer.observe(this.observedLoadTrigger);
    }
  }

  private scheduleSearch(query: string): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    const requestVersion = ++this.requestVersion;
    this.seenEntryIds.clear();
    this.entries.set([]);
    this.hasMore.set(true);
    this.errorMessage.set(null);
    this.isLoading.set(true);

    this.searchDebounceTimer = setTimeout(() => {
      this.searchDebounceTimer = null;
      void this.loadBatch(requestVersion, query.trim(), false);
    }, 250);
  }

  async loadMore(): Promise<void> {
    if (this.isLoading() || !this.hasMore()) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    await this.loadBatch(this.requestVersion, this.searchQuery().trim(), true);
  }

  private async loadBatch(
    requestVersion: number,
    query: string,
    allowRemote: boolean,
  ): Promise<void> {
    try {
      let batch = await this.learnFeedService.loadRandomBatch(this.seenEntryIds, BATCH_SIZE, query);
      if (allowRemote && batch.length < BATCH_SIZE && this.learnFeedService.canFetchRemote()) {
        batch = await this.learnFeedService.loadRemoteBatch(this.seenEntryIds, BATCH_SIZE, query);
      }
      if (requestVersion !== this.requestVersion) {
        return;
      }
      await this.learnFeedService.markAsShown(batch);
      if (requestVersion !== this.requestVersion) {
        return;
      }
      for (const entry of batch) {
        this.seenEntryIds.add(entry.id);
      }
      this.entries.update((current) => [...current, ...batch]);
      this.hasMore.set(batch.length === BATCH_SIZE || this.learnFeedService.canFetchRemote());
    } catch {
      if (requestVersion === this.requestVersion) {
        this.errorMessage.set('LEARN.ERROR');
      }
    } finally {
      if (requestVersion === this.requestVersion) {
        this.isLoading.set(false);
      }
    }
  }
}
