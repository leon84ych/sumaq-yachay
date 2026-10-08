import { Component, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { DomainDataService } from '../../catalog-detail/services/domain-data.service';
import { DomainSheet, IndexRow } from '../../catalog-detail/models/domain-sheet.model';

@Component({
  selector: 'app-index',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe],
  templateUrl: './domain-index.html',
  styleUrls: ['./domain-index.css']
})
export class IndexComponent {

  readonly rows = input.required<IndexRow[]>();
  readonly currentSheet = input.required<DomainSheet>();
  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();

  private domainDataService = inject(DomainDataService);
  private globalErrorService = inject(GlobalErrorService);


  // Form state for adding a new index entry
  readonly newChapter = signal<string>('');
  readonly newTheme = signal<string>('');
  readonly newSubtheme = signal<string>('');
  readonly newTag = signal<string>('');

  public resetForm() {
    this.newChapter.set('');
    this.newTheme.set('');
    this.newSubtheme.set('');
    this.newTag.set('');
    this.closeEntry.emit();
  }

  async addIndexEntry() {
    const chapter = this.newChapter().trim();
    const theme = this.newTheme().trim();
    const subtheme = this.newSubtheme().trim();
    const tag = this.newTag().trim();

    if (!chapter || !theme || !tag) {
      return; // Basic validation
    }

    const newRowData = {
      id: 'idx_' + Date.now(),
      chapter,
      theme,
      subtheme,
      tag,
      syncStatus: 'pending'
    };

    // Append row locally / push to backend service (depending on your mutation flow)
    // Example integration using your domain data framework
    const updatedRows = [...this.rows(), newRowData];
    
    // Call your service update method here (e.g. updating item/row)
    try {
      await this.domainDataService.updateDomainSheetRows(this.currentSheet().name, updatedRows);
      this.resetForm();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add index entry.';
      this.globalErrorService.show(errorMessage);
      console.error('Failed to add index entry:', err);
    }
  }
}