import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../../core/services/global-error.service';
import { DomainDataService } from '../../../catalog-detail/services/domain-data.service';
import { DomainSheet } from '../../../catalog-detail/models/domain-sheet.model';
import { PassagesRow } from '../model/domain-passage-row.model';
import { TaxonomyService } from '../../../../core/services/taxonomy/taxonomy.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { parseTagsFromArray, serializeTagsToArray } from '../../../../shared/utils/tag-utils';
import { StudySearchService } from '../../../../core/services/study-search.service';
import { matchesStudySearch } from '../../../../shared/utils/study-search';
import { PassageEntryCardComponent } from '../components/passage-entry-card/passage-entry-card.component';
import { PassageReaderComponent } from '../components/passage-reader/passage-reader.component';

import { PassageFormComponent } from '../components/passage-form/passage-form.component';

@Component({
  selector: 'app-domain-passage',
  standalone: true,
  imports: [
    PassageFormComponent,
    CommonModule,
    FormsModule,
    TranslocoPipe,
    PassageEntryCardComponent,
    PassageReaderComponent,
  ],
  templateUrl: './domain-passage.component.html',
  styleUrls: ['./domain-passage.component.css'],
})
export class DomainPassageComponent {
  readonly rows = input.required<PassagesRow[]>();
  readonly currentSheet = input.required<DomainSheet>();
  readonly bookName = input<string>('');
  readonly bookAuthor = input<string>('');
  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();
  readonly selectedPassage = signal<PassagesRow | null>(null);
  readonly searchTerm = inject(StudySearchService).query;

  readonly newTitle = signal<string>('');
  readonly newPassageText = signal<string>('');
  readonly newBook = signal<string>('');
  readonly newAuthor = signal<string>('');
  readonly newPage = signal<string>('');
  readonly newTags = signal<string[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly passageTextMaxLength = 2000;
  readonly passageTextCharactersRemaining = computed(
    () => this.passageTextMaxLength - this.newPassageText().length,
  );

  private domainDataService = inject(DomainDataService);
  private globalErrorService = inject(GlobalErrorService);
  private readonly transloco = inject(TranslocoService);
  private readonly taxonomyService = inject(TaxonomyService);
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;

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

    return this.rows().filter((row) => matchesStudySearch(query,
      [this.bookName(), this.bookAuthor(), 'passages', 'pasajes',
        row.title, row.passageText, row.book, row.author, row.page ?? '', ...(row.tags ?? [])], row.tags,
        { book: this.bookName() || row.book, author: this.bookAuthor() || row.author, contributor: row.contributor }),
    );
  });

  constructor() {
    effect(() => {
      if (this.bookName()) {
        this.newBook.set(this.bookName());
      }
      if (this.bookAuthor()) {
        this.newAuthor.set(this.bookAuthor());
      }
    });
  }

  splitTags(tags: string[]): string[] {
    return parseTagsFromArray(tags);
  }

  openReader(row: PassagesRow): void {
    this.selectedPassage.set(row);
  }

  closeReader(): void {
    this.selectedPassage.set(null);
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
    this.newTags.set(row.tags ?? []);
  }

  resetForm(): void {
    this.editingId.set(null);
    this.newTitle.set('');
    this.newPassageText.set('');
    this.newBook.set('');
    this.newAuthor.set('');
    this.newPage.set('');
    this.newTags.set([]);
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
    const tags = serializeTagsToArray(this.newTags());
    const editingId = this.editingId();

    try {
      const localRows = editingId
        ? ((await this.domainDataService.getLocalDomainSheetRows(
            this.currentSheet().name,
          )) as PassagesRow[])
        : this.rows();
      const existingRows = localRows.length > 0 ? localRows : this.rows();
      const originalRow = editingId ? existingRows.find((row) => row.id === editingId) : undefined;
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
