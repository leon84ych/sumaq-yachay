import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { DomainSheet } from '../../catalog-detail/models/domain-sheet.model';
import { DomainDataService } from '../../catalog-detail/services/domain-data.service';
import { IndexViewRow, normalizeIndexRows } from './index-view-row';

export type { IndexViewRow } from './index-view-row';

interface IndexHierarchyGroup {
  chapter: string;
  themes: Array<{
    theme: string;
    rows: IndexViewRow[];
  }>;
}

@Component({
  selector: 'app-index-view',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe],
  templateUrl: './index-view.component.html',
  styleUrls: ['./index-view.component.css'],
})
export class IndexViewComponent {
  readonly rows = input.required<IndexViewRow[]>();
  readonly currentSheet = input.required<DomainSheet>();
  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();

  readonly newChapter = signal<string>('');
  readonly newTheme = signal<string>('');
  readonly newSubtheme = signal<string>('');
  readonly newTag = signal<string>('');

  private readonly domainDataService = inject(DomainDataService);
  private readonly globalErrorService = inject(GlobalErrorService);

  readonly hierarchy = computed<IndexHierarchyGroup[]>(() => {
    const sortedRows = normalizeIndexRows(this.rows()).sort((left, right) =>
      left.chapter.localeCompare(right.chapter) ||
      left.theme.localeCompare(right.theme) ||
      left.subtheme.localeCompare(right.subtheme)
    );

    const groups = new Map<string, IndexHierarchyGroup>();

    for (const row of sortedRows) {
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

  resetForm(): void {
    this.newChapter.set('');
    this.newTheme.set('');
    this.newSubtheme.set('');
    this.newTag.set('');
    this.closeEntry.emit();
  }

  async addIndexEntry(): Promise<void> {
    const chapter = this.newChapter().trim();
    const theme = this.newTheme().trim();
    const subtheme = this.newSubtheme().trim();
    const tag = this.newTag().trim();

    if (!chapter || !theme || !tag) {
      return;
    }

    const newRow: IndexViewRow = {
      id: `idx_`,
      chapter,
      theme,
      subtheme,
      tag,
      syncStatus: 'pending',
    };

    try {
      await this.domainDataService.updateDomainSheetRows(
        this.currentSheet().name,
        [...this.rows(), newRow]
      );
      this.resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add index entry.';
      this.globalErrorService.show(message);
    }
  }
}
