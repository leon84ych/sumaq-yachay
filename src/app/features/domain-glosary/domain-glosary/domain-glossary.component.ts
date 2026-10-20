import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { DomainDataService } from '../../catalog-detail/services/domain-data.service';
import { DomainSheet } from '../../catalog-detail/models/domain-sheet.model';
import { TagPickerComponent } from '../../../shared/tag-picker.component';
import { TaxonomyService } from '../../../core/services/taxonomy/taxonomy.service';
import { PermissionService } from '../../../core/services/permission.service';
import { GlossaryEntryCardComponent } from '../components/glossary-entry-card/glossary-entry-card.component';

import type { GlossaryRow, PartOfSpeech } from '../model/domain-glosary-row.model';

const PARTS_OF_SPEECH: PartOfSpeech[] = [
  'Sustantivo',
  'Adjetivo',
  'Verbo',
  'Adverbio',
  'Locución',
  'Otro',
];

@Component({
  selector: 'app-domain-glossary',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    TagPickerComponent,
    GlossaryEntryCardComponent,
  ],
  templateUrl: './domain-glossary.component.html',
  styleUrls: ['./domain-glossary.component.css'],
})
export class DomainGlossaryComponent {
  readonly rows = input.required<GlossaryRow[]>();
  readonly currentSheet = input.required<DomainSheet>();
  readonly bookName = input<string>('');
  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();

  readonly partsOfSpeech = PARTS_OF_SPEECH;
  readonly newTerm = signal<string>('');
  readonly newDefinition = signal<string>('');
  readonly newPartOfSpeech = signal<PartOfSpeech | ''>('');
  readonly newEtymology = signal<string>('');
  readonly newSynonyms = signal<string>('');
  readonly newContextSentence = signal<string>('');
  readonly newSource = signal<string>('');
  readonly newPage = signal<string>('');
  readonly newTags = signal<string>('');
  readonly searchTerm = signal<string>('');
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
    return !this.newTerm().trim() || !this.newDefinition().trim() || this.invalidTagsDetected().length > 0;
  });

  readonly filteredRows = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    if (!query) return this.rows();

    return this.rows().filter((row) =>
      [
        row.term,
        row.definition,
        row.partOfSpeech ?? '',
        row.etymology ?? '',
        row.synonyms ?? '',
        row.contextSentence ?? '',
        row.source ?? '',
        row.page ?? '',
        row.tags ?? '',
      ].some((val) => String(val ?? '').toLocaleLowerCase().includes(query)),
    );
  });

  splitTags(tags: string): string[] {
    return tags
      .split(/[\s,;]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  async deleteEntry(id: string): Promise<void> {
    if (!window.confirm(this.transloco.translate('COMMON.CONFIRM_DELETE'))) {
      return;
    }

    try {
      await this.domainDataService.deleteDomainRow(this.currentSheet().name, id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete glossary entry.';
      this.globalErrorService.show(message);
    }
  }

  editEntry(row: GlossaryRow): void {
    this.editingId.set(row.id);
    this.newTerm.set(row.term);
    this.newDefinition.set(row.definition);
    this.newPartOfSpeech.set(row.partOfSpeech ?? '');
    this.newEtymology.set(row.etymology ?? '');
    this.newSynonyms.set(row.synonyms ?? '');
    this.newContextSentence.set(row.contextSentence ?? '');
    this.newSource.set(row.source ?? '');
    this.newPage.set(row.page ?? '');
    this.newTags.set(row.tags ?? '');
  }

  resetForm(): void {
    this.editingId.set(null);
    this.newTerm.set('');
    this.newDefinition.set('');
    this.newPartOfSpeech.set('');
    this.newEtymology.set('');
    this.newSynonyms.set('');
    this.newContextSentence.set('');
    this.newSource.set('');
    this.newPage.set('');
    this.newTags.set('');
    this.closeEntry.emit();
  }

  async addEntry(): Promise<void> {
    if (this.isFormInvalid()) {
      this.globalErrorService.show('Cannot add entry: Please remove unauthorized tags.');
      return;
    }

    const term = this.newTerm().trim();
    const definition = this.newDefinition().trim();
    const partOfSpeech = this.newPartOfSpeech() || undefined;
    const etymology = this.newEtymology().trim();
    const synonyms = this.newSynonyms().trim();
    const contextSentence = this.newContextSentence().trim();
    const source = this.source();
    const page = this.newPage().trim();
    const tags = this.splitTags(this.newTags()).join(' ');
    const editingId = this.editingId();

    try {
      const localRows = editingId
        ? ((await this.domainDataService.getLocalDomainSheetRows(this.currentSheet().name)) as GlossaryRow[])
        : this.rows();
      const existingRows = localRows.length > 0 ? localRows : this.rows();
      const originalRow = editingId
        ? existingRows.find((row) => row.id === editingId)
        : undefined;
      if (editingId && !originalRow) {
        throw new Error('The glossary entry being edited is no longer available.');
      }

      const newRow: GlossaryRow = {
        ...(originalRow ?? {}),
        id: editingId ?? `glossary_${Date.now()}`,
        term,
        definition,
        partOfSpeech,
        etymology: etymology || undefined,
        synonyms: synonyms || undefined,
        contextSentence: contextSentence || undefined,
        source: source || undefined,
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
      const message = error instanceof Error ? error.message : 'Failed to add glossary entry.';
      this.globalErrorService.show(message);
    }
  }
}
