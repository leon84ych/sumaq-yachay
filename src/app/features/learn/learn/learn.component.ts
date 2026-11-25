import { DOCUMENT, NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  signal,
  Type,
  untracked,
  ViewChild,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/error/global-error.service';
import { StudySearchService } from '../../../core/services/search/study-search.service';
import { downloadJpeg } from '../../../shared/utils/image-export';
import { PlaceEntryCardComponent } from '../../domain-1/places/components/place-entry-card/place-entry-card.component';
import { GlossaryEntryCardComponent } from '../../domain-1/glossary/components/glossary-entry-card/glossary-entry-card.component';
import { IndexEntryCardComponent } from '../../domain-1/index/components/index-entry-card/index-entry-card.component';
import { PassageEntryCardComponent } from '../../domain-1/passages/components/passage-entry-card/passage-entry-card.component';
import { QuoteEntryCardComponent } from '../../domain-1/quotes/components/quote-entry-card/quote-entry-card.component';
import { CharacterEntryCardComponent } from '../../domain-1/characters/components/character-entry-card/character-entry-card.component';
import { ConceptEntryCardComponent } from '../../domain-1/concepts/components/concept-entry-card/concept-entry-card.component';
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
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly learnFeedService = inject(LearnFeedService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly globalErrorService = inject(GlobalErrorService);
  private readonly transloco = inject(TranslocoService);
  private readonly seenEntryIds = new Set<string>();

  readonly entries = signal<LearnFeedEntry[]>([]);
  readonly searchQuery = inject(StudySearchService).query;
  readonly entryBeingExported = signal<LearnFeedEntry | null>(null);
  readonly exportTheme = signal<'dark' | 'light'>('dark');
  readonly exportUrl = signal('');
  readonly isExporting = signal(false);
  readonly isLoading = signal(false);
  readonly hasMore = signal(true);
  readonly errorMessage = signal<string | null>(null);
  @ViewChild('ghostExportCard') private ghostExportCard?: ElementRef<HTMLElement>;
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
          row: entry.sourceRow,
          showActions: false,
        };
      case 'CONCEPTS':
        return {
          ...context,
          row: entry.sourceRow,
          sourceDomain: entry.domain,
          showActions: false,
          showContext: true,
        };
      case 'GLOSARY':
        return {
          ...context,
          row: entry.sourceRow,
          showActions: false,
        };
      case 'INDEX':
        return {
          ...context,
          row: entry.sourceRow,
          showActions: false,
          showContext: true,
          showHierarchy: true,
        };
      case 'PASSAGES':
        return {
          ...context,
          row: entry.sourceRow,
          showActions: false,
          showReadAction: true,
          showContext: true,
          readerMode: 'internal',
        };
      case 'PLACES':
        return {
          ...context,
          row: entry.sourceRow,
          showActions: false,
          showContext: true,
        };
      case 'QUOTES':
        return {
          ...context,
          row: entry.sourceRow,
          showActions: false,
        };
      default:
        return { entry };
    }
  }

  async exportEntryImage(entry: LearnFeedEntry): Promise<void> {
    if (this.isExporting()) {
      return;
    }

    this.isExporting.set(true);
    this.entryBeingExported.set(entry);
    this.exportTheme.set(
      this.document.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark',
    );
    this.exportUrl.set(this.document.defaultView?.location.href ?? '');
    this.changeDetectorRef.detectChanges();

    try {
      const exportCard = this.ghostExportCard?.nativeElement;
      if (!exportCard) {
        throw new Error('Learn image template is unavailable.');
      }

      const safeId = entry.id.replace(/[^a-z0-9_-]+/gi, '-');
      await downloadJpeg(exportCard, `learn-${entry.domain.toLowerCase()}-${safeId}.jpg`, {
        backgroundColor: this.exportTheme() === 'light' ? '#ffffff' : '#1a1a1a',
      });
    } catch {
      this.globalErrorService.show(this.transloco.translate('LEARN.EXPORT_ERROR'));
    } finally {
      this.entryBeingExported.set(null);
      this.isExporting.set(false);
      this.changeDetectorRef.detectChanges();
    }
  }

  constructor() {
    this.destroyRef.onDestroy(() => {
      ++this.requestVersion;
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }
    });
    effect(() => {
      const query = this.searchQuery();
      untracked(() => this.scheduleSearch(query));
    });
  }

  onSearchInput(query: string): void {
    this.searchQuery.set(query);
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
      let batch = await this.learnFeedService.loadRandomBatch(
        this.seenEntryIds,
        BATCH_SIZE,
        query,
      );
      if (allowRemote && batch.length < BATCH_SIZE && this.learnFeedService.canFetchRemote()) {
        batch = await this.learnFeedService.loadRemoteBatch(this.seenEntryIds, BATCH_SIZE, query);
      }
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
