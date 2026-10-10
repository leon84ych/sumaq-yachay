import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { downloadJpeg } from '../../../shared/utils/image-export';
import { DomainDataService } from '../../catalog-detail/services/domain-data.service';
import { DomainSheet, QuoteRow } from '../../catalog-detail/models/domain-sheet.model';
import { TagPickerComponent } from '../../../shared/tag-picker.component';

@Component({
  selector: 'app-quote-gallery',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, TagPickerComponent],
  templateUrl: './quote-gallery.component.html',
  styleUrls: ['./quote-gallery.component.css'],
})
export class QuoteGalleryComponent {
  readonly applicationName = document.title || 'sumaq-yachay';
  readonly baseDomain = window.location.hostname;
  readonly rows = input.required<QuoteRow[]>();
  readonly currentSheet = input.required<DomainSheet>();
  readonly bookName = input<string>('');
  readonly bookAuthor = input<string>('');
  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();

  readonly newQuote = signal<string>('');
  readonly newAnalysis = signal<string>('');
  readonly newBook = signal<string>('');
  readonly newAuthor = signal<string>('');
  readonly newPage = signal<string>('');
  readonly newTags = signal<string>('');
  readonly exportRow = signal<QuoteRow | null>(null);
  readonly isExporting = signal(false);
  readonly searchTerm = signal('');
  readonly flippedQuoteIndexes = signal<ReadonlySet<number>>(new Set());
  readonly quoteMaxLength = 600;
  readonly quoteCharactersRemaining = computed(() => this.quoteMaxLength - this.newQuote().length);
  readonly filteredRows = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    return this.rows()
      .map((row, index) => ({ row, index }))
      .filter(
        ({ row }) =>
          !query ||
          [row.quote, row.analysis, row.author, row.book, row.page, row.tags].some((value) =>
            String(value ?? '')
              .toLocaleLowerCase()
              .includes(query),
          ),
      );
  });

  splitTags(tags: string): string[] {
    return tags
      .split(/[\s,;]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  @ViewChild('ghostQuoteCard') private ghostQuoteCard?: ElementRef<HTMLElement>;
  @ViewChild('ghostAnalysisCard') private ghostAnalysisCard?: ElementRef<HTMLElement>;

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private domainDataService = inject(DomainDataService);
  private globalErrorService = inject(GlobalErrorService);

  constructor() {
    effect(() => {
      const bookName = this.bookName();
      const bookAuthor = this.bookAuthor();

      if (bookName) {
        this.newBook.set(bookName);
      }
      if (bookAuthor) {
        this.newAuthor.set(bookAuthor);
      }
    });
  }

  resetForm(): void {
    this.newQuote.set('');
    this.newAnalysis.set('');
    this.newBook.set('');
    this.newAuthor.set('');
    this.newPage.set('');
    this.newTags.set('');
    this.closeEntry.emit();
  }

  isFlipped(index: number): boolean {
    return this.flippedQuoteIndexes().has(index);
  }

  toggleCard(row: QuoteRow, index: number): void {
    if (!row.analysis) {
      return;
    }

    this.flippedQuoteIndexes.update((flippedIndexes) => {
      const nextFlippedIndexes = new Set(flippedIndexes);
      if (nextFlippedIndexes.has(index)) {
        nextFlippedIndexes.delete(index);
      } else {
        nextFlippedIndexes.add(index);
      }
      return nextFlippedIndexes;
    });
  }

  onCardKeydown(event: KeyboardEvent, row: QuoteRow, index: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleCard(row, index);
    }
  }

  async downloadImage(event: MouseEvent, row: QuoteRow, side: 'quote' | 'analysis'): Promise<void> {
    event.stopPropagation();

    if (this.isExporting()) {
      return;
    }
    if (side === 'analysis' && !row.analysis) {
      return;
    }

    this.isExporting.set(true);
    this.exportRow.set(row);
    this.changeDetectorRef.detectChanges();

    try {
      const exportCard =
        side === 'quote'
          ? this.ghostQuoteCard?.nativeElement
          : this.ghostAnalysisCard?.nativeElement;

      if (!exportCard) {
        throw new Error('Quote image templates are unavailable.');
      }

      const filename = side === 'quote' ? `quote-${row.id}.jpg` : `analysis-${row.id}.jpg`;
      await downloadJpeg(exportCard, filename);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export quote images.';
      this.globalErrorService.show(message);
    } finally {
      this.exportRow.set(null);
      this.isExporting.set(false);
      this.changeDetectorRef.detectChanges();
    }
  }

  async addQuote(): Promise<void> {
    const quote = this.newQuote().trim();
    const analysis = this.newAnalysis().trim();
    const book = this.newBook().trim();
    const author = this.newAuthor().trim();
    const page = this.newPage().trim();
    const tags = this.newTags().trim();

    if (!quote || !book || !author) {
      return;
    }

    const newRow: QuoteRow = {
      id: `quote_${Date.now()}`,
      quote,
      ...(analysis ? { analysis } : {}),
      book,
      author,
      ...(page ? { page } : {}),
      ...(tags ? { tags } : {}),
      feed: 5,
      contributor: 'currentUser',
      syncStatus: 'pending',
    };

    try {
      await this.domainDataService.updateDomainSheetRows(this.currentSheet().name, [
        ...this.rows(),
        newRow,
      ]);
      this.resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add quote.';
      this.globalErrorService.show(message);
    }
  }
}
