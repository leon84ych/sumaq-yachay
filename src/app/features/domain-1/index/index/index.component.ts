import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../../core/services/error/global-error.service';

import { PermissionService } from '../../../../core/services/permission/permission.service';
import { IndexEntryCardComponent } from '../components/index-entry-card/index-entry-card.component';
import { StudySearchService } from '../../../../core/services/search/study-search.service';

interface IndexHierarchyGroup {
  chapter: string;
  themes: Array<{
    theme: string;
    rows: IndexRecord[];
  }>;
}

import { IndexEntryFormComponent } from '../components/index-entry-form/index-entry-form.component';
import { IndexRecord } from '../model/index-model';
import { IndexDataService } from '../services/index.service';
import { matchesStudySearch } from '../../../../shared/utils/study-search';
import { GlobalLoadingService } from '../../../../core/services/loading/global-loading.service';


@Component({
  selector: 'app-domain-index-1',
  standalone: true,
  imports: [
    IndexEntryFormComponent,
    CommonModule,
    FormsModule,
    TranslocoPipe,
    IndexEntryCardComponent,
  ],
  templateUrl: './index.component.html',
  styleUrls: ['./index.component.css'],
})
export class IndexComponent implements OnInit {

  /**
   * Domain components must only receive the BookId, Row and the count of elements 
   * and each domain is responsible for managing its own entries.
   */


  readonly bookId = input.required<string>();

  // Input and output signals for managing Index Form
  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();

  //Store the elements to be shown in this domain
  readonly rows = signal<IndexRecord[]>([]);
  readonly bookName = signal<string>('');
  readonly bookAuthor = signal<string>('');

  readonly newChapter = signal<string>('');
  readonly newTheme = signal<string>('');
  readonly newSubtheme = signal<string>('');
  readonly newTags = signal<string[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly searchTerm = inject(StudySearchService).query;

  private readonly indexDataService = inject(IndexDataService);
  private readonly globalLoadingService = inject(GlobalLoadingService);
  
  private readonly globalErrorService = inject(GlobalErrorService);

  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;
  private readonly transloco = inject(TranslocoService);


  readonly filteredRows = computed(() => {
    const query = this.searchTerm();

    return this.rows().filter((row) =>
      matchesStudySearch(
        query,
        [this.bookName(), this.bookAuthor(), 'index', 'índice', row.chapter, row.theme, row.subtheme, row.contributor, ...row.tags],
        row.tags,
        { book: this.bookName(), author: this.bookAuthor(), contributor: row.contributor },
      ),
    );
  });



  async ngOnInit(): Promise<void> {
    // Initialization logic if needed
    //1. Retrieve the book info from service 
    if (this.bookId() != null) {
      const bookRecord = await this.indexDataService.getBookRecord(this.bookId());
      this.bookName.set(bookRecord?.name ?? '');
      this.bookAuthor.set(bookRecord?.author ?? '');
      // 2. Retrieve the index records for the specified book, row, and count
      this.rows.set(await this.indexDataService.getRecords(this.bookId()));
    }

  }

  /**
   * 1. MASTER DOMAIN VALIDATION CAP
   * Evaluates core model prerequisites. Since INDEX creates definitions,
   * it is never marked invalid based on Taxonomy constraints.
   */
  readonly isFormInvalid = computed<boolean>(() => {
    return !this.newChapter().trim() || !this.newTheme().trim() || this.newTags().length === 0;
  });


  readonly hierarchy = computed<IndexHierarchyGroup[]>(() => {

    const groups = new Map<string, IndexHierarchyGroup>();

    for (const row of this.filteredRows()) {
      let chapterGroup = groups.get(row.chapter);
      if (!chapterGroup) {
        chapterGroup = { chapter: row.chapter, themes: [] };
        groups.set(row.chapter, chapterGroup);
      }

      let themeGroup = chapterGroup.themes.find((theme) => theme.theme === row.theme);
      if (!themeGroup) {
        themeGroup = { theme: row.theme, rows: [] };
        chapterGroup.themes.push(themeGroup);
      }

      themeGroup.rows.push(row);
    }

    return [...groups.values()];
  });

  async deleteEntry(id: string): Promise<void> {
    if (!window.confirm(this.transloco.translate('COMMON.CONFIRM_DELETE'))) {
      return;
    }

    const row = this.rows().find((item) => item.id === id);
    if (!row) {
      return;
    }

    try {
      await this.indexDataService.deleteDomainItem(row);
      this.rows.update((rows) => rows.filter((item) => item.id !== id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete index entry.';
      this.globalErrorService.show(message);
    }
  }

  editEntry(row: IndexRecord): void {
    this.submitted.set(false);
    this.editingId.set(row.id);
    this.newChapter.set(row.chapter);
    this.newTheme.set(row.theme);
    this.newSubtheme.set(row.subtheme);
    this.newTags.set(row.tags);
  }

  resetForm(): void {
    this.submitted.set(false);
    this.editingId.set(null);
    this.newChapter.set('');
    this.newTheme.set('');
    this.newSubtheme.set('');
    this.newTags.set([]);
    this.closeEntry.emit();
  }

  async addIndexEntry(): Promise<void> {
    this.submitted.set(true);
    if (this.isFormInvalid()) {
      return;
    }

    const book = await this.indexDataService.getBookRecord(this.bookId());
    if (!book?.row) {
      throw new Error('Book record is missing row.');
    }

    const indexEntry: IndexRecord = {
      id: this.editingId() ?? `idx_${Date.now()}`,
      bookRow: book.row,
      feed: 0,
      bookId: this.bookId(),
      contributor: '',
      itemRow: 0,
      chapter: this.newChapter(),
      theme: this.newTheme(),
      subtheme: this.newSubtheme(),
      tags: this.newTags(),
      syncStatus: 'pending'
    };

    const operation = this.globalLoadingService.begin();
    this.closeEntry.emit();
    try {
      const savedEntry = this.editingId()
        ? await this.indexDataService.updateDomainItem(indexEntry)
        : await this.indexDataService.addDomainItem(indexEntry);
      this.rows.update((rows) => {
        const existingIndex = rows.findIndex((row) => row.id === indexEntry.id);
        if (existingIndex === -1) {
          return [...rows, savedEntry];
        }

        return rows.map((row, index) => (index === existingIndex ? savedEntry : row));
      });
      this.resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add index entry.';
      this.globalErrorService.show(message);
    } finally {
      this.globalLoadingService.end(operation);
    }
  }
}
