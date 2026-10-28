import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../../core/services/global-error.service';
import { DomainDataService } from '../../../catalog-detail/services/domain-data.service';
import { DomainSheet } from '../../../catalog-detail/models/domain-sheet.model';
import { ConceptEntryCardComponent } from '../components/concept-entry-card/concept-entry-card.component';
import { ConceptRow } from '../model/domain-concept-row.model';
import { TaxonomyService } from '../../../../core/services/taxonomy/taxonomy.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { parseTags, serializeTags } from '../../../../shared/utils/tag-utils';
import { StudySearchService } from '../../../../core/services/study-search.service';
import { matchesStudySearch } from '../../../../shared/utils/study-search';

const NODE_CATEGORIES = [
  'theory-model',
  'phenomenon-process',
  'principle-axiom',
  'paradigm-school',
  'technical-construct',
  'other',
] as const;

import { ConceptFormComponent } from '../components/concept-form/concept-form.component';

@Component({
  selector: 'app-domain-concept',
  standalone: true,
  imports: [
    ConceptFormComponent,
    CommonModule,
    FormsModule,
    TranslocoPipe,
    ConceptEntryCardComponent,
  ],
  templateUrl: './domain-concept.component.html',
  styleUrls: ['./domain-concept.component.css'],
})
export class DomainConceptsComponent {
  readonly rows = input.required<ConceptRow[]>();
  readonly currentSheet = input.required<DomainSheet>();
  readonly bookName = input<string>('');
  readonly bookAuthor = input<string>('');
  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();

  readonly nodeCategories = NODE_CATEGORIES;
  readonly newTerm = signal<string>('');
  readonly newDefinition = signal<string>('');
  readonly newCategory = signal<string>('');
  readonly customCategory = signal<string>('');
  readonly newSource = signal<string>('');
  readonly newTags = signal<string[]>([]);
  readonly searchTerm = inject(StudySearchService).query;
  readonly editingId = signal<string | null>(null);
  readonly source = computed(() => this.newSource().trim() || this.bookName().trim());
  readonly definitionMaxLength = 400;
  readonly definitionCharactersRemaining = computed(
    () => this.definitionMaxLength - this.newDefinition().length,
  );

  private domainDataService = inject(DomainDataService);
  private globalErrorService = inject(GlobalErrorService);
  private readonly transloco = inject(TranslocoService);
  private readonly taxonomyService = inject(TaxonomyService);
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;

  /**
   * 1. REAL-TIME SIGNAL VALIDATION GUARD
   * Evaluates if any user-typed tags are missing from the master INDEX sheet whitelist matrix.
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
   * 2. FORM INHERENT VALIDATION CAP
   * Evaluates if core model prerequisites or tag system integrity rules are violated.
   */
  readonly isFormInvalid = computed<boolean>(() => {
    return (
      !this.newTerm().trim() ||
      !this.newDefinition().trim() ||
      this.invalidTagsDetected().length > 0
    );
  });

  readonly filteredRows = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    if (!query) {
      return this.rows();
    }

    return this.rows().filter((row) => matchesStudySearch(query,
      [this.bookName(), this.bookAuthor(), 'concepts', 'conceptos',
        row.term, row.category ?? '', ...(row.tags ?? [])], row.tags,
        { book: this.bookName(), author: this.bookAuthor(), contributor: row.contributor }),
    );
  });

  splitTags(tags: string[]): string[] {
    return parseTags(tags);
  }

  async deleteEntry(id: string): Promise<void> {
    if (!window.confirm(this.transloco.translate('COMMON.CONFIRM_DELETE'))) {
      return;
    }

    try {
      await this.domainDataService.deleteDomainRow(this.currentSheet().name, id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete concept.';
      this.globalErrorService.show(message);
    }
  }

  editEntry(row: ConceptRow): void {
    this.editingId.set(row.id);
    this.newTerm.set(row.term);
    this.newDefinition.set(row.definition);
    const category = row.category ?? '';
    const isBuiltInCategory = NODE_CATEGORIES.includes(
      category as (typeof NODE_CATEGORIES)[number],
    );
    this.newCategory.set(isBuiltInCategory ? category : category ? 'other' : '');
    this.customCategory.set(isBuiltInCategory ? '' : category);
    this.newSource.set(row.source ?? '');
    this.newTags.set(row.tags ?? []);
  }

  resetForm(): void {
    this.editingId.set(null);
    this.newTerm.set('');
    this.newDefinition.set('');
    this.newCategory.set('');
    this.customCategory.set('');
    this.newSource.set('');
    this.newTags.set([]);
    this.closeEntry.emit();
  }

  async addConcept(): Promise<void> {
    if (this.isFormInvalid()) {
      this.globalErrorService.show('Cannot add entry: Please remove unauthorized tags.');
      return;
    }

    const term = this.newTerm().trim();
    const definition = this.newDefinition().trim();
    const selectedCategory = this.newCategory();
    const category = selectedCategory === 'other' ? this.customCategory().trim() : selectedCategory;
    const source = this.source();
    const tags = serializeTags(this.newTags());
    const editingId = this.editingId();

    try {
      const localRows = editingId
        ? ((await this.domainDataService.getLocalDomainSheetRows(
            this.currentSheet().name,
          )) as ConceptRow[])
        : this.rows();
      const existingRows = localRows.length > 0 ? localRows : this.rows();
      const originalRow = editingId ? existingRows.find((row) => row.id === editingId) : undefined;
      if (editingId && !originalRow) {
        throw new Error('The concept being edited is no longer available.');
      }

      const newRow: ConceptRow = {
        ...(originalRow ?? {}),
        id: editingId ?? `concept_${Date.now()}`,
        term,
        definition,
        category: category || undefined,
        source: source || undefined,
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
      const message = error instanceof Error ? error.message : 'Failed to add concept.';
      this.globalErrorService.show(message);
    }
  }
}
