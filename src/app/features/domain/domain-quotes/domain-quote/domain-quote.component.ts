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
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../../core/services/global-error.service';
import { downloadJpeg } from '../../../../shared/utils/image-export';
import { DomainDataService } from '../../../catalog-detail/services/domain-data.service';
import { DomainSheet } from '../../../catalog-detail/models/domain-sheet.model';
import type { QuoteRow } from '../model/domain-quote-row.model';
import { TaxonomyService } from '../../../../core/services/taxonomy/taxonomy.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { QuoteEntryCardComponent } from '../components/quote-entry-card/quote-entry-card.component';
import { parseTagsFromArray, serializeTagsToArray } from '../../../../shared/utils/tag-utils';
import { StudySearchService } from '../../../../core/services/study-search.service';
import { matchesStudySearch } from '../../../../shared/utils/study-search';

import { QuoteFormComponent } from '../components/quote-form/quote-form.component';

@Component({
  selector: 'app-domain-quote',
  standalone: true,
  imports: [QuoteFormComponent, CommonModule, FormsModule, TranslocoPipe, QuoteEntryCardComponent],
  templateUrl: './domain-quote.component.html',
  styleUrls: ['./domain-quote.component.css'],
})
export class DomainQuoteComponent {
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
  readonly newTags = signal<string[]>([]);
  readonly exportRow = signal<QuoteRow | null>(null);
  readonly isExporting = signal(false);
  readonly searchTerm = inject(StudySearchService).query;
  readonly editingId = signal<string | null>(null);
  readonly quoteMaxLength = 600;
  readonly quoteCharactersRemaining = computed(() => this.quoteMaxLength - this.newQuote().length);

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private domainDataService = inject(DomainDataService);
  private globalErrorService = inject(GlobalErrorService);
  private readonly transloco = inject(TranslocoService);
  private readonly taxonomyService = inject(TaxonomyService);
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;

  /**
   * 1. REAL-TIME SIGNAL VALIDATION GUARD
   * Monitors changes to newTags() and builds an array of elements missing from the INDEX cache list.
   */
  readonly invalidTagsDetected = computed<string[]>(() => {
    const activeTokens = this.splitTags(this.newTags());
    const forbidden: string[] = [];

    for (const token of activeTokens) {
      if (!this.taxonomyService.isTagAllowed(token)) {
        forbidden.push(token);
      }
    }
    return forbidden;
  });

  /**
   * 2. EXPLICIT FORM INHERENT VALIDATION CAP
   * Returns true if required data fields are blank or if there are any unauthorized system tags.
   */
  readonly isFormInvalid = computed<boolean>(() => {
    return (
      !this.newQuote().trim() ||
      !this.newBook().trim() ||
      !this.newAuthor().trim() ||
      this.invalidTagsDetected().length > 0
    );
  });

  readonly filteredRows = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    return this.rows().filter(
      (row) =>
        !query ||
        matchesStudySearch(query, [this.bookName(), this.bookAuthor(), 'quotes', 'citas',
          row.quote, row.analysis, row.author, row.book, row.page, ...(row.tags ?? [])], row.tags,
          { book: this.bookName() || row.book, author: this.bookAuthor() || row.author, contributor: row.contributor }),
    );
  });

  splitTags(tags: string[]): string[] {
    return parseTagsFromArray(tags);
  }

  @ViewChild('ghostQuoteCard') private ghostQuoteCard?: ElementRef<HTMLElement>;
  @ViewChild('ghostAnalysisCard') private ghostAnalysisCard?: ElementRef<HTMLElement>;

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

  async deleteEntry(id: string): Promise<void> {
    if (!window.confirm(this.transloco.translate('COMMON.CONFIRM_DELETE'))) {
      return;
    }

    try {
      await this.domainDataService.deleteDomainRow(this.currentSheet().name, id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete quote.';
      this.globalErrorService.show(message);
    }
  }

  editEntry(row: QuoteRow): void {
    this.editingId.set(row.id);
    this.newQuote.set(row.quote);
    this.newAnalysis.set(row.analysis ?? '');
    this.newBook.set(row.book);
    this.newAuthor.set(row.author);
    this.newPage.set(row.page ?? '');
    this.newTags.set(row.tags ?? []);
  }

  resetForm(): void {
    this.editingId.set(null);
    this.newQuote.set('');
    this.newAnalysis.set('');
    this.newBook.set('');
    this.newAuthor.set('');
    this.newPage.set('');
    this.newTags.set([]);
    this.closeEntry.emit();
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
    if (this.isFormInvalid()) {
      this.globalErrorService.show('Cannot add entry: Please remove unauthorized tags.');
      return;
    }

    const quote = this.newQuote().trim();
    const analysis = this.newAnalysis().trim();
    const book = this.newBook().trim();
    const author = this.newAuthor().trim();
    const page = this.newPage().trim();
    const tags = serializeTagsToArray(this.newTags());
    const editingId = this.editingId();

    try {
      const localRows = editingId
        ? ((await this.domainDataService.getLocalDomainSheetRows(
            this.currentSheet().name,
          )) as QuoteRow[])
        : this.rows();
      const existingRows = localRows.length > 0 ? localRows : this.rows();
      const originalRow = editingId ? existingRows.find((row) => row.id === editingId) : undefined;
      if (editingId && !originalRow) {
        throw new Error('The quote being edited is no longer available.');
      }

      const newRow: QuoteRow = {
        ...(originalRow ?? {}),
        id: editingId ?? `quote_${Date.now()}`,
        quote,
        analysis: analysis || undefined,
        book,
        author,
        page: page || undefined,
        tags: tags || undefined,
        feed: originalRow?.feed ?? 5,
        contributor: originalRow?.contributor ?? 'currentUser',
        syncStatus: 'pending',
      };
      const updatedRows = editingId
        ? existingRows.map((row) => (row.id === editingId ? newRow : row))
        : [...existingRows, newRow];

      await this.domainDataService.updateDomainSheetRows(
        this.currentSheet().name,
        updatedRows,
        true,
        editingId ?? undefined,
        editingId ? undefined : newRow.id,
      );
      this.resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add quote.';
      this.globalErrorService.show(message);
    }
  }
}
