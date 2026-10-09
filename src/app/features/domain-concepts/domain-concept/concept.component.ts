import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { DomainDataService } from '../../catalog-detail/services/domain-data.service';
import { ConceptRow, DomainSheet } from '../../catalog-detail/models/domain-sheet.model';

@Component({
  selector: 'app-concepts',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe],
  templateUrl: './concept.component.html',
  styleUrls: ['./concept.component.css'],
})
export class ConceptsComponent {
  readonly rows = input.required<ConceptRow[]>();
  readonly currentSheet = input.required<DomainSheet>();
  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();

  readonly newTerm = signal<string>('');
  readonly newDefinition = signal<string>('');
  readonly newCategory = signal<string>('');
  readonly newSource = signal<string>('');
  readonly newTags = signal<string>('');
  readonly definitionMaxLength = 400;
  readonly definitionCharactersRemaining = computed(
    () => this.definitionMaxLength - this.newDefinition().length
  );

  private domainDataService = inject(DomainDataService);
  private globalErrorService = inject(GlobalErrorService);

  resetForm(): void {
    this.newTerm.set('');
    this.newDefinition.set('');
    this.newCategory.set('');
    this.newSource.set('');
    this.newTags.set('');
    this.closeEntry.emit();
  }

  async addConcept(): Promise<void> {
    const term = this.newTerm().trim();
    const definition = this.newDefinition().trim();
    const category = this.newCategory().trim();
    const source = this.newSource().trim();
    const tags = this.newTags().trim();

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
      await this.domainDataService.updateDomainSheetRows(
        this.currentSheet().name,
        [...this.rows(), newRow]
      );
      this.resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add concept.';
      this.globalErrorService.show(message);
    }
  }
}
