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
  readonly searchTerm = inject(StudySearchService).query;

  private readonly indexDataService = inject(IndexDataService);
  private readonly globalErrorService = inject(GlobalErrorService);
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;
  private readonly transloco = inject(TranslocoService);


  readonly filteredRows = signal<IndexRecord[]>([]);



  async ngOnInit(): Promise<void> {
    // Initialization logic if needed
    //1. Retrieve the book info from service 
    if (this.bookId() != null) {
      const catalogRecord = await this.indexDataService.getCatalogRecord(this.bookId());
      this.bookName.set(catalogRecord?.name ?? '');
      this.bookAuthor.set(catalogRecord?.author ?? '');
      // 2. Retrieve the index records for the specified book, row, and count
      this.filteredRows.set(await this.indexDataService.getRecords(this.bookId()));
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

    try {
      // await this.indexDataService.deleteDomainRow(this.currentSheet().name, id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete index entry.';
      this.globalErrorService.show(message);
    }
  }

  editEntry(row: IndexRecord): void {
    this.editingId.set(row.id);
    this.newChapter.set(row.chapter);
    this.newTheme.set(row.theme);
    this.newSubtheme.set(row.subtheme);
    this.newTags.set(row.tags);
  }

  resetForm(): void {
    this.editingId.set(null);
    this.newChapter.set('');
    this.newTheme.set('');
    this.newSubtheme.set('');
    this.newTags.set([]);
    this.closeEntry.emit();
  }

  async addIndexEntry(): Promise<void> {
    if (this.isFormInvalid()) {
      return;
    }
    throw new Error("Method not implemented.");
    // const chapter = this.newChapter().trim();
    // const theme = this.newTheme().trim();
    // const subtheme = this.newSubtheme().trim();
    // console.log('Tags before:', this.newTags());
    // const tags = serializeTagsToBE(this.newTags());
    // console.log('Tags after serialization:', tags);
    // const editingId = this.editingId();

    // try {
    //   const localRows = editingId
    //     ? ((await this.domainDataService.getLocalDomainSheetRows(
    //         this.currentSheet().name,
    //       )) as IndexRecord[])
    //     : this.rows();
    //   const existingRows = localRows.length > 0 ? localRows : this.rows();
    //   const originalRow = editingId ? existingRows.find((row) => row.id === editingId) : undefined;
    //   if (editingId && !originalRow) {
    //     throw new Error('The INDEX entry being edited is no longer available.');
    //   }

    //   const newRow: IndexRecord = {
    //     ...(originalRow ?? {}),
    //     id: editingId ?? `idx_${Date.now()}`,
    //     chapter,
    //     theme,
    //     subtheme,
    //     tags,
    //     syncStatus: 'pending',
    //     contributor: '',   //TODO add user email
    //   };
    //   const updatedRows = editingId
    //     ? existingRows.map((row) => (row.id === editingId ? newRow : row))
    //     : [...existingRows, newRow];

    //   await this.domainDataService.updateDomainSheetRows(
    //     this.currentSheet().name,
    //     updatedRows,
    //     true,
    //     editingId ?? undefined,
    //     editingId ? undefined : newRow.id,
    //   );
    //   this.resetForm();
    // } catch (error) {
    //   const message = error instanceof Error ? error.message : 'Failed to add index entry.';
    //   this.globalErrorService.show(message);
    // }
  }
}
