import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { DomainDataService } from '../../catalog-detail/services/domain-data.service';
import { DomainSheet, QuoteRow } from '../../catalog-detail/models/domain-sheet.model';

@Component({
  selector: 'app-quote-gallery',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe],
  templateUrl: './quote-gallery.component.html',
  styleUrls: ['./quote-gallery.component.css'],
})
export class QuoteGalleryComponent {
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
  readonly quoteMaxLength = 600;
  readonly quoteCharactersRemaining = computed(
    () => this.quoteMaxLength - this.newQuote().length
  );

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
      await this.domainDataService.updateDomainSheetRows(
        this.currentSheet().name,
        [...this.rows(), newRow]
      );
      this.resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add quote.';
      this.globalErrorService.show(message);
    }
  }
}
