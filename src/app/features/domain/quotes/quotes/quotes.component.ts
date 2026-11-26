import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { GlobalLoadingService } from '../../../../core/services/loading/global-loading.service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { StudySearchService } from '../../../../core/services/search/study-search.service';
import { matchesStudySearch } from '../../../../shared/utils/study-search';
import {
  normalizeTagsFromArray,
  parseTagsFromArray,
} from '../../../../shared/tag-picker/tag-picker.mapper';
import { QuoteEntryCardComponent } from '../components/quote-entry-card/quote-entry-card.component';
import { QuoteEntryFormComponent } from '../components/quote-entry-form/quote-entry-form.component';
import { QUOTE_DEFAULT_FEED, QuoteRecord } from '../model/quotes-model';
import { QuoteDataService } from '../services/quotes.service';

@Component({
  selector: 'app-domain-quotes',
  imports: [FormsModule, TranslocoPipe, QuoteEntryFormComponent, QuoteEntryCardComponent],
  templateUrl: './quotes.component.html',
  styleUrls: ['./quotes.component.css'],
})
export class QuotesComponent implements OnInit {
  /** Domain components only receive the book ID and manage their own entries. */
  readonly bookId = input.required<string>();
  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();

  // Unfiltered local source of truth for this book.
  readonly rows = signal<QuoteRecord[]>([]);
  readonly bookName = signal('');
  readonly bookAuthor = signal('');
  readonly bookRow = signal<number | null>(null);
  private readonly allowedTags = signal<ReadonlySet<string>>(new Set());

  readonly newQuote = signal('');
  readonly newAnalysis = signal('');
  readonly newBook = signal('');
  readonly newAuthor = signal('');
  readonly newPage = signal('');
  readonly newTags = signal<string[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly isSaving = signal(false);
  readonly searchTerm = inject(StudySearchService).query;
  readonly quoteMaxLength = 600;
  readonly quoteCharactersRemaining = computed(() => this.quoteMaxLength - this.newQuote().length);

  private readonly quoteDataService = inject(QuoteDataService);
  private readonly globalMessageService = inject(GlobalMessageService);
  private readonly globalLoadingService = inject(GlobalLoadingService);
  private readonly transloco = inject(TranslocoService);
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;

  /** Tags typed in the form that are not part of the book's INDEX taxonomy. */
  readonly invalidTagsDetected = computed<string[]>(() => {
    const allowed = this.allowedTags();
    return parseTagsFromArray(this.newTags()).filter(
      (tag) => !allowed.has(normalizeTagsFromArray([tag])[0]),
    );
  });

  readonly isFormInvalid = computed<boolean>(
    () =>
      !this.newQuote().trim() ||
      !this.newBook().trim() ||
      !this.newAuthor().trim() ||
      this.invalidTagsDetected().length > 0,
  );

  readonly filteredRows = computed(() => {
    const query = this.searchTerm().trim();
    const bookName = this.bookName();
    const bookAuthor = this.bookAuthor();

    return this.rows().filter(
      (row) =>
        !query ||
        matchesStudySearch(
          query,
          [
            bookName,
            bookAuthor,
            'quotes',
            'citas',
            row.quote,
            row.analysis,
            row.author,
            row.book,
            row.page,
            row.contributor,
            ...row.tags,
          ],
          row.tags,
          {
            book: bookName || row.book,
            author: bookAuthor || row.author,
            contributor: row.contributor,
          },
        ),
    );
  });

  constructor() {
    // Opening the form must see the latest INDEX tags.
    effect(() => {
      if (this.isAddingEntry()) {
        untracked(() => void this.refreshAllowedTags());
      }
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const book = await this.quoteDataService.getBookRecord(this.bookId());
      this.bookName.set(book?.name ?? '');
      this.bookAuthor.set(book?.author ?? '');
      this.bookRow.set(book?.row ?? null);
      this.newBook.set(this.bookName());
      this.newAuthor.set(this.bookAuthor());

      await this.refreshAllowedTags();
      this.rows.set(await this.quoteDataService.getRecords(this.bookId()));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load quotes.';
      this.globalMessageService.showError(message);
    }
  }

  async refreshAllowedTags(): Promise<void> {
    try {
      const tags = await this.quoteDataService.getAllowedTags(this.bookId());
      this.allowedTags.set(new Set(normalizeTagsFromArray(tags)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load book tags.';
      this.globalMessageService.showError(message);
    }
  }

  async deleteEntry(id: string): Promise<void> {
    if (!window.confirm(this.transloco.translate('COMMON.CONFIRM_DELETE'))) {
      return;
    }

    const row = this.rows().find((item) => item.id === id);
    if (!row) {
      return;
    }

    try {
      await this.quoteDataService.deleteDomainItem(row);
      this.rows.update((rows) => rows.filter((item) => item.id !== id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete quote.';
      this.globalMessageService.showError(message);
    }
  }

  editEntry(row: QuoteRecord): void {
    this.submitted.set(false);
    this.editingId.set(row.id);
    this.newQuote.set(row.quote);
    this.newAnalysis.set(row.analysis);
    this.newBook.set(row.book);
    this.newAuthor.set(row.author);
    this.newPage.set(row.page);
    this.newTags.set(row.tags);
    void this.refreshAllowedTags();
  }

  resetForm(): void {
    this.submitted.set(false);
    this.editingId.set(null);
    this.newQuote.set('');
    this.newAnalysis.set('');
    this.newBook.set(this.bookName());
    this.newAuthor.set(this.bookAuthor());
    this.newPage.set('');
    this.newTags.set([]);
    this.closeEntry.emit();
  }

  async saveQuote(): Promise<void> {
    if (this.isSaving()) {
      return;
    }
    this.submitted.set(true);
    if (this.isFormInvalid()) {
      return;
    }

    const editingId = this.editingId();
    const original = editingId ? this.rows().find((row) => row.id === editingId) : undefined;
    if (editingId && !original) {
      this.globalMessageService.showError('The quote being edited is no longer available.');
      return;
    }

    const bookRow = this.bookRow() ?? original?.bookRow;
    if (!bookRow) {
      this.globalMessageService.showError('Book record is missing row.');
      return;
    }

    const record: QuoteRecord = {
      id: editingId ?? `quote_${Date.now()}`,
      bookId: this.bookId(),
      bookRow,
      itemRow: original?.itemRow ?? 0,
      quote: this.newQuote().trim(),
      analysis: this.newAnalysis().trim(),
      book: this.newBook().trim(),
      author: this.newAuthor().trim(),
      page: this.newPage().trim(),
      tags: normalizeTagsFromArray(this.newTags()),
      feed: original?.feed ?? QUOTE_DEFAULT_FEED,
      contributor: original?.contributor ?? '',
      syncStatus: 'pending',
    };

    const operation = this.globalLoadingService.begin();
    this.isSaving.set(true);
    try {
      const saved = editingId
        ? await this.quoteDataService.updateDomainItem(record)
        : await this.quoteDataService.addDomainItem(record);
      this.rows.update((rows) => {
        const existingIndex = rows.findIndex((row) => row.id === record.id);
        if (existingIndex === -1) {
          return [...rows, saved];
        }
        return rows.map((row, index) => (index === existingIndex ? saved : row));
      });
      this.resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save quote.';
      this.globalMessageService.showError(message);
    } finally {
      this.isSaving.set(false);
      this.globalLoadingService.end(operation);
    }
  }
}
