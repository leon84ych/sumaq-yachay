import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { DomainDataService } from '../../catalog-detail/services/domain-data.service';
import { ConceptRow, DomainSheet } from '../../catalog-detail/models/domain-sheet.model';
import { TagPickerComponent } from '../../../shared/tag-picker.component';

const NODE_CATEGORIES = [
  'theory-model',
  'phenomenon-process',
  'principle-axiom',
  'paradigm-school',
  'technical-construct',
  'other',
] as const;

@Component({
  selector: 'app-concepts',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, TagPickerComponent],
  templateUrl: './concept.component.html',
  styleUrls: ['./concept.component.css'],
})
export class ConceptsComponent {
  readonly rows = input.required<ConceptRow[]>();
  readonly currentSheet = input.required<DomainSheet>();
  readonly bookName = input<string>('');
  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();
  readonly relationsRequested = output<ConceptRow>();

  readonly nodeCategories = NODE_CATEGORIES;
  readonly newTerm = signal<string>('');
  readonly newDefinition = signal<string>('');
  readonly newCategory = signal<string>('');
  readonly customCategory = signal<string>('');
  readonly newSource = signal<string>('');
  readonly newTags = signal<string>('');
  readonly searchTerm = signal<string>('');
  readonly source = computed(() => this.newSource().trim() || this.bookName().trim());
  readonly definitionMaxLength = 400;
  readonly definitionCharactersRemaining = computed(
    () => this.definitionMaxLength - this.newDefinition().length,
  );
  readonly filteredRows = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    if (!query) {
      return this.rows();
    }

    return this.rows().filter((row) =>
      [row.term, row.category ?? '', row.tags ?? ''].some((value) =>
        value.toLocaleLowerCase().includes(query),
      ),
    );
  });

  private domainDataService = inject(DomainDataService);
  private globalErrorService = inject(GlobalErrorService);

  splitTags(tags: string): string[] {
    return tags
      .split(/[\s,;]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  viewRelations(row: ConceptRow): void {
    this.relationsRequested.emit(row);
  }

  isNodeCategory(category: string | undefined): boolean {
    return NODE_CATEGORIES.includes(category as (typeof NODE_CATEGORIES)[number]);
  }

  resetForm(): void {
    this.newTerm.set('');
    this.newDefinition.set('');
    this.newCategory.set('');
    this.customCategory.set('');
    this.newSource.set('');
    this.newTags.set('');
    this.closeEntry.emit();
  }

  async addConcept(): Promise<void> {
    const term = this.newTerm().trim();
    const definition = this.newDefinition().trim();
    const selectedCategory = this.newCategory();
    const category = selectedCategory === 'other' ? this.customCategory().trim() : selectedCategory;
    const source = this.source();
    const tags = this.splitTags(this.newTags()).join(' ');

    if (!term || !definition) {
      return;
    }

    const newRow: ConceptRow = {
      id: `concept_${Date.now()}`,
      term,
      definition,
      ...(category ? { category } : {}),
      ...(source ? { source } : {}),
      ...(tags ? { tags } : {}),
      feed: 5,
      contributor: 'currentUser',
      syncStatus: 'pending',
    };

    try {
      await this.domainDataService.updateDomainSheetRows(this.currentSheet().name, [
        ...this.rows(),
        newRow,
      ]);
      this.resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add concept.';
      this.globalErrorService.show(message);
    }
  }
}
