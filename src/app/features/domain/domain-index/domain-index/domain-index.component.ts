import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../../core/services/global-error.service';
import { DomainSheet } from '../../../catalog-detail/models/domain-sheet.model';
import { DomainDataService } from '../../../catalog-detail/services/domain-data.service';
import { IndexViewRow, normalizeIndexRows } from '../model/index-view-row';
import { serializeTags } from '../../../../shared/utils/tag-utils';
import { PermissionService } from '../../../../core/services/permission.service';
import { IndexEntryCardComponent } from '../components/index-entry-card/index-entry-card.component';

export type { IndexViewRow } from '../model/index-view-row';

interface IndexHierarchyGroup {
  chapter: string;
  themes: Array<{
    theme: string;
    rows: IndexViewRow[];
  }>;
}

import { IndexEntryFormComponent } from '../components/index-entry-form/index-entry-form.component';

@Component({
  selector: 'app-domain-index',
  standalone: true,
  imports: [
    IndexEntryFormComponent,
    CommonModule,
    FormsModule,
    TranslocoPipe,
    IndexEntryCardComponent,
  ],
  templateUrl: './domain-index.component.html',
  styleUrls: ['./domain-index.component.css'],
})
export class DomainIndexComponent {
  readonly rows = input.required<IndexViewRow[]>();
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

  readonly hierarchy = computed<IndexHierarchyGroup[]>(() => {
    const orderedRows = normalizeIndexRows(this.rows());

    const groups = new Map<string, IndexHierarchyGroup>();

    for (const row of orderedRows) {
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

  editEntry(row: IndexViewRow): void {
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

    const chapter = this.newChapter().trim();
    const theme = this.newTheme().trim();
    const subtheme = this.newSubtheme().trim();
    const tags = serializeTags(this.newTags());
    const editingId = this.editingId();

    try {
      const localRows = editingId
        ? ((await this.domainDataService.getLocalDomainSheetRows(
            this.currentSheet().name,
          )) as IndexViewRow[])
        : this.rows();
      const existingRows = localRows.length > 0 ? localRows : this.rows();
      const originalRow = editingId ? existingRows.find((row) => row.id === editingId) : undefined;
      if (editingId && !originalRow) {
        throw new Error('The INDEX entry being edited is no longer available.');
      }

      const newRow: IndexViewRow = {
        ...(originalRow ?? {}),
        id: editingId ?? `idx_${Date.now()}`,
        chapter,
        theme,
        subtheme,
        tags,
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
      const message = error instanceof Error ? error.message : 'Failed to add index entry.';
      this.globalErrorService.show(message);
    }
  }
}
