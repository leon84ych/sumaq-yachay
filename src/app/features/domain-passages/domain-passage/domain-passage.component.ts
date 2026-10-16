import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { DomainDataService } from '../../catalog-detail/services/domain-data.service';
import { DomainSheet } from '../../catalog-detail/models/domain-sheet.model';
import { TagPickerComponent } from '../../../shared/tag-picker.component';
import { PassagesRow } from '../model/domain-passage-row.model';
import { TaxonomyService } from '../../../core/services/taxonomy/taxonomy.service';
import { PermissionService } from '../../../core/services/permission.service';

@Component({
  selector: 'app-domain-passage',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, TagPickerComponent],
  templateUrl: './domain-passage.component.html',
  styleUrls: ['./domain-passage.component.css'],
  host: {
    '(document:keydown.escape)': 'closeReader()',
  },
})
export class DomainPassageComponent {
  readonly rows = input.required<PassagesRow[]>();
  readonly currentSheet = input.required<DomainSheet>();
  readonly bookName = input<string>('');
  readonly bookAuthor = input<string>('');
  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();
  readonly selectedPassage = signal<PassagesRow | null>(null);
  readonly searchTerm = signal('');
  readonly readingProgress = signal(0);
  readonly readerFontSize = signal(1.125);
  readonly readerFontFamily = signal<'serif' | 'sans'>('serif');
  readonly readerJustified = signal(false);
  readonly readerTheme = signal<'light' | 'dark'>('light');
  readonly copyStatus = signal<'idle' | 'copied' | 'error'>('idle');

  readonly newTitle = signal<string>('');
  readonly newPassageText = signal<string>('');
  readonly newBook = signal<string>('');
  readonly newAuthor = signal<string>('');
  readonly newPage = signal<string>('');
  readonly newTags = signal<string>('');
  readonly editingId = signal<string | null>(null);
  readonly passageTextMaxLength = 2000;
  readonly passageTextCharactersRemaining = computed(
    () => this.passageTextMaxLength - this.newPassageText().length,
  );

  private domainDataService = inject(DomainDataService);
  private globalErrorService = inject(GlobalErrorService);
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly taxonomyService = inject(TaxonomyService);
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;
  private bodyOverflowBeforeReader: string | null = null;

  /**
   * 1. REAL-TIME SIGNAL VALIDATION GUARD
   * Monitors newTags() entries and identifies fields missing from the INDEX cache layout.
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
   * 2. EXPLICIT FORM VALIDATION CAP
   * Evaluates if model criteria or tax system parameters are broken.
   */
  readonly isFormInvalid = computed<boolean>(() => {
    return (
      !this.newTitle().trim() ||
      !this.newPassageText().trim() ||
      !this.newBook().trim() ||
      !this.newAuthor().trim() ||
      this.invalidTagsDetected().length > 0
    );
  });

  readonly filteredRows = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    if (!query) {
      return this.rows();
    }

    return this.rows().filter((row) =>
      [row.title, row.passageText, row.book, row.author, row.page ?? '', row.tags ?? ''].some(
        (value) => value.toLocaleLowerCase().includes(query),
      ),
    );
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.restoreBodyScroll());

    effect(() => {
      if (this.bookName()) {
        this.newBook.set(this.bookName());
      }
      if (this.bookAuthor()) {
        this.newAuthor.set(this.bookAuthor());
      }
    });
  }

  estimateReadingMinutes(text: string): number {
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  }

  splitTags(tags: string): string[] {
    return tags
      .split(/[\s,;]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  openReader(row: PassagesRow): void {
    if (this.selectedPassage()) {
      this.closeReader();
    }

    const body = this.document.body;
    this.readerTheme.set(
      this.document.documentElement.dataset['theme'] === 'dark' ? 'dark' : 'light',
    );
    if (body) {
      this.bodyOverflowBeforeReader = body.style.overflow;
      body.style.overflow = 'hidden';
    }

    this.readingProgress.set(0);
    this.selectedPassage.set(row);
  }

  adjustReaderFontSize(delta: number): void {
    this.readerFontSize.update((size) => Math.min(2, Math.max(1, size + delta)));
  }

  readerFontSizePercent(): number {
    return Math.round(this.readerFontSize() * 100);
  }

  setReaderFontFamily(event: Event): void {
    this.readerFontFamily.set(
      (event.target as HTMLSelectElement).value === 'sans' ? 'sans' : 'serif',
    );
  }

  toggleReaderJustification(): void {
    this.readerJustified.update((justified) => !justified);
  }

  toggleReaderTheme(): void {
    this.readerTheme.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
  }

  async copyPassageText(): Promise<void> {
    const text = this.selectedPassage()?.passageText;
    if (!text) {
      return;
    }

    try {
      const clipboard = this.document.defaultView?.navigator.clipboard;
      if (clipboard?.writeText) {
        await clipboard.writeText(text);
      } else if (!this.copyTextFallback(text)) {
        throw new Error('Clipboard access is unavailable.');
      }
      this.copyStatus.set('copied');
    } catch {
      this.copyStatus.set('error');
    }
  }

  private copyTextFallback(text: string): boolean {
    const body = this.document.body;
    if (!body) {
      return false;
    }

    const textarea = this.document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    body.appendChild(textarea);
    textarea.select();
    const copied = this.document.execCommand('copy');
    textarea.remove();
    return copied;
  }

  closeReader(): void {
    if (!this.selectedPassage()) {
      return;
    }

    this.selectedPassage.set(null);
    this.readingProgress.set(0);
    this.restoreBodyScroll();
  }

  updateReadingProgress(event: Event): void {
    const container = event.target as HTMLElement;
    const scrollableDistance = container.scrollHeight - container.clientHeight;
    const progress = scrollableDistance > 0 ? (container.scrollTop / scrollableDistance) * 100 : 0;
    this.readingProgress.set(Math.min(100, Math.max(0, progress)));
  }

  private restoreBodyScroll(): void {
    if (this.bodyOverflowBeforeReader === null) {
      return;
    }

    if (this.document.body) {
      this.document.body.style.overflow = this.bodyOverflowBeforeReader;
    }
    this.bodyOverflowBeforeReader = null;
  }

  async deleteEntry(id: string): Promise<void> {
    if (!window.confirm(this.transloco.translate('COMMON.CONFIRM_DELETE'))) {
      return;
    }

    try {
      await this.domainDataService.deleteDomainRow(this.currentSheet().name, id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete passage.';
      this.globalErrorService.show(message);
    }
  }

  editEntry(row: PassagesRow): void {
    this.editingId.set(row.id);
    this.newTitle.set(row.title);
    this.newPassageText.set(row.passageText);
    this.newBook.set(row.book);
    this.newAuthor.set(row.author);
    this.newPage.set(row.page ?? '');
    this.newTags.set(row.tags ?? '');
  }

  resetForm(): void {
    this.editingId.set(null);
    this.newTitle.set('');
    this.newPassageText.set('');
    this.newBook.set('');
    this.newAuthor.set('');
    this.newPage.set('');
    this.newTags.set('');
    this.closeEntry.emit();
  }

  onPassageTextInput(event: Event): void {
    const target = event.target as HTMLElement;
    const value = target.textContent?.trim() ?? '';
    this.newPassageText.set(value.slice(0, this.passageTextMaxLength));
  }

  async addPassage(): Promise<void> {
    if (this.isFormInvalid()) {
      this.globalErrorService.show('Cannot add entry: Please remove unauthorized tags.');
      return;
    }

    const title = this.newTitle().trim();
    const passageText = this.newPassageText().trim();
    const book = this.newBook().trim();
    const author = this.newAuthor().trim();
    const page = this.newPage().trim();
    const tags = this.splitTags(this.newTags()).join(' ');
    const editingId = this.editingId();

    try {
      const localRows = editingId
        ? ((await this.domainDataService.getLocalDomainSheetRows(this.currentSheet().name)) as PassagesRow[])
        : this.rows();
      const existingRows = localRows.length > 0 ? localRows : this.rows();
      const originalRow = editingId
        ? existingRows.find((row) => row.id === editingId)
        : undefined;
      if (editingId && !originalRow) {
        throw new Error('The passage being edited is no longer available.');
      }

      const newRow: PassagesRow = {
        ...(originalRow ?? {}),
        id: editingId ?? `passage_${Date.now()}`,
        title,
        passageText,
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
      const message = error instanceof Error ? error.message : 'Failed to add passage.';
      this.globalErrorService.show(message);
    }
  }
}
