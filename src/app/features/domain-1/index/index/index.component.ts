import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../../core/services/error/global-error.service';
import { DomainSheet } from '../../../catalog-detail/models/domain-sheet.model';
import { DomainDataService } from '../../../catalog-detail/services/domain-data.service';
import { serializeTagsToArray, serializeTagsToBE } from '../../../../shared/utils/tag-utils';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { IndexEntryCardComponent } from '../components/index-entry-card/index-entry-card.component';
import { StudySearchService } from '../../../../core/services/search/study-search.service';
import { matchesStudySearch } from '../../../../shared/utils/study-search';


interface IndexHierarchyGroup {
  chapter: string;
  themes: Array<{
    theme: string;
    rows: IndexRecord[];
  }>;
}

import { IndexEntryFormComponent } from '../components/index-entry-form/index-entry-form.component';
import { IndexRecord } from '../model/index-model';


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
export class IndexComponent {
  readonly rows = input.required<IndexRecord[]>();
  readonly currentSheet = input.required<DomainSheet>();
  readonly bookName = input<string>('');
  readonly bookAuthor = input<string>('');
  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();

  readonly newChapter = signal<string>('');
  readonly newTheme = signal<string>('');
  readonly newSubtheme = signal<string>('');
  readonly newTags = signal<string[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly searchTerm = inject(StudySearchService).query;

  private readonly domainDataService = inject(DomainDataService);
  private readonly globalErrorService = inject(GlobalErrorService);
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;
  private readonly transloco = inject(TranslocoService);

  /**
   * 1. MASTER DOMAIN VALIDATION CAP
   * Evaluates core model prerequisites. Since INDEX creates definitions,
   * it is never marked invalid based on Taxonomy constraints.
   */
  readonly isFormInvalid = computed<boolean>(() => {
    return !this.newChapter().trim() || !this.newTheme().trim() || this.newTags().length === 0;
  });

  readonly filteredRows = computed(() => this.rows().filter((row) =>
    matchesStudySearch(this.searchTerm(), [
      this.bookName(), this.bookAuthor(), 'index', 'índice',
      row.chapter, row.theme, row.subtheme, ...(row.tags ?? []),
    ], row.tags, { book: this.bookName(), author: this.bookAuthor(), contributor: row.contributor }),
  ));

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
      await this.domainDataService.deleteDomainRow(this.currentSheet().name, id);
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
    this.newTags.set(serializeTagsToArray(row.tags));
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
