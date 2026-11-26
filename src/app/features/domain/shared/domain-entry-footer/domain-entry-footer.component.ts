import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { DomainContributorComponent } from '../domain-contributor/domain-contributor.component';
import { DomainEntryExportService } from './domain-entry-export.service';
import {
  DomainEntryReviewData,
  DomainEntryReviewOutcome,
  DomainEntryReviewService,
} from './domain-entry-review.service';

export interface DomainEntryExportData {
  id: string;
  domain: string;
  bookName: unknown;
  bookAuthor: unknown;
  title: unknown;
  body: unknown;
  note?: unknown;
  tags: readonly unknown[];
  accentColor?: unknown;
}

interface NormalizedDomainEntryExportData {
  id: string;
  domain: string;
  bookName: string;
  bookAuthor: string;
  title: string;
  body: string;
  note: string;
  tags: string[];
  accentColor?: string;
}

@Component({
  selector: 'app-domain-entry-footer',
  imports: [DomainContributorComponent, TranslocoPipe],
  templateUrl: './domain-entry-footer.component.html',
  styleUrl: './domain-entry-footer.component.css',
})
export class DomainEntryFooterComponent {
  private readonly document = inject(DOCUMENT);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly globalMessageService = inject(GlobalMessageService);
  private readonly transloco = inject(TranslocoService);
  private readonly exportService = inject(DomainEntryExportService);
  private readonly reviewService = inject(DomainEntryReviewService);

  readonly contributor = input<unknown>('');
  readonly exportData = input<DomainEntryExportData | null>(null);
  readonly reviewData = input<DomainEntryReviewData | null>(null);
  readonly showDelete = input(false);
  readonly showEdit = input(false);
  readonly deleteRequested = output<void>();
  readonly editRequested = output<void>();
  readonly isExporting = this.exportService.isExporting;
  readonly isReviewing = signal(false);
  readonly forgottenSelected = signal(false);
  readonly recalledSelected = signal(false);
  readonly hasReviewSelection = computed(() => this.forgottenSelected() || this.recalledSelected());
  readonly normalizedExportData = computed(() => {
    const entry = this.exportData();
    return entry
      ? {
          id: entry.id,
          domain: entry.domain,
          bookName: this.toText(entry.bookName),
          bookAuthor: this.toText(entry.bookAuthor),
          title: this.toText(entry.title),
          body: this.toText(entry.body),
          note: this.toText(entry.note),
          tags: entry.tags.filter((tag): tag is string => typeof tag === 'string'),
          ...(typeof entry.accentColor === 'string' ? { accentColor: entry.accentColor } : {}),
        }
      : null;
  });
  readonly hasContributor = computed(() => {
    const contributor = this.contributor();
    return typeof contributor === 'string' && contributor.trim().length > 0;
  });
  readonly hasFooterContent = computed(
    () =>
      this.showDelete() ||
      this.showEdit() ||
      this.hasContributor() ||
      this.reviewData() !== null ||
      this.normalizedExportData() !== null,
  );
  readonly entryBeingExported = signal<NormalizedDomainEntryExportData | null>(null);
  readonly exportTheme = signal<'dark' | 'light'>('dark');
  readonly exportUrl = signal('');
  @ViewChild('ghostExportCard') private ghostExportCard?: ElementRef<HTMLElement>;

  async recordReview(outcome: DomainEntryReviewOutcome): Promise<void> {
    const entry = this.reviewData();
    if (!entry || this.isReviewing() || this.hasReviewSelection()) {
      return;
    }

    this.isReviewing.set(true);
    try {
      await this.reviewService.incrementReviewCount(entry, outcome);
      if (outcome === 'forgotten') {
        this.forgottenSelected.set(true);
      } else {
        this.recalledSelected.set(true);
      }
    } catch (error) {
      this.globalMessageService.showError(
        error instanceof Error ? error.message : this.transloco.translate('LEARN.REVIEW_ERROR'),
      );
    } finally {
      this.isReviewing.set(false);
    }
  }

  async exportEntryImage(entry: NormalizedDomainEntryExportData): Promise<void> {
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
        throw new Error('Domain entry image template is unavailable.');
      }

      const safeId = entry.id.replace(/[^a-z0-9_-]+/gi, '-');
      await this.exportService.download(
        exportCard,
        `learn-${entry.domain.toLowerCase()}-${safeId}.jpg`,
        { backgroundColor: this.exportTheme() === 'light' ? '#ffffff' : '#1a1a1a' },
      );
    } catch {
      this.globalMessageService.showError(this.transloco.translate('LEARN.EXPORT_ERROR'));
    } finally {
      this.entryBeingExported.set(null);
      this.isExporting.set(false);
      this.changeDetectorRef.detectChanges();
    }
  }

  private toText(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  }
}
