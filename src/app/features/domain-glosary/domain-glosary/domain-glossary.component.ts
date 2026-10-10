import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { DomainDataService } from '../../catalog-detail/services/domain-data.service';
import { DomainSheet } from '../../catalog-detail/models/domain-sheet.model';
import { TagPickerComponent } from '../../../shared/tag-picker.component';

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
  imports: [CommonModule, FormsModule, TranslocoPipe, TagPickerComponent],
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

  readonly source = computed(() => this.newSource().trim() || this.bookName().trim());
  readonly definitionMaxLength = 400;
  readonly definitionCharactersRemaining = computed(
    () => this.definitionMaxLength - this.newDefinition().length,
  );

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

  private domainDataService = inject(DomainDataService);
  private globalErrorService = inject(GlobalErrorService);

  splitTags(tags: string): string[] {
    return tags
      .split(/[\s,;]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  resetForm(): void {
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
    const term = this.newTerm().trim();
    const definition = this.newDefinition().trim();
    const partOfSpeech = this.newPartOfSpeech() || undefined;
    const etymology = this.newEtymology().trim();
    const synonyms = this.newSynonyms().trim();
    const contextSentence = this.newContextSentence().trim();
    const source = this.source();
    const page = this.newPage().trim();
    const tags = this.splitTags(this.newTags()).join(' ');

    if (!term || !definition) {
      return;
    }

    const newRow: GlossaryRow = {
      id: `glossary_${Date.now()}`,
      term,
      definition,
      ...(partOfSpeech ? { partOfSpeech } : {}),
      ...(etymology ? { etymology } : {}),
      ...(synonyms ? { synonyms } : {}),
      ...(contextSentence ? { contextSentence } : {}),
      ...(source ? { source } : {}),
      ...(page ? { page } : {}),
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
      const message = error instanceof Error ? error.message : 'Failed to add glossary entry.';
      this.globalErrorService.show(message);
    }
  }
}