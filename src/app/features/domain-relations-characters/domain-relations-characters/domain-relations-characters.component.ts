import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { PermissionService } from '../../../core/services/permission.service';
import { TaxonomyService } from '../../../core/services/taxonomy/taxonomy.service';
import { TagPickerComponent } from '../../../shared/tag-picker.component';
import { parseTags, serializeTags } from '../../../shared/utils/tag-utils';
import { DomainSheet } from '../../catalog-detail/models/domain-sheet.model';
import { DomainDataService } from '../../catalog-detail/services/domain-data.service';
import { CharacterRow } from '../../domain-character/models/domain-character-row.model';
import {
  BookRelationCharacter,
  getRelationTypeSuggestions,
} from '../model/book-relation-character.model';
import { RelationEntryCardComponent } from '../components/relation-entry-card/relation-entry-card.component';

@Component({
  selector: 'app-domain-relations-characters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    TagPickerComponent,
    RelationEntryCardComponent,
  ],
  templateUrl: './domain-relations-characters.component.html',
  styleUrl: './domain-relations-characters.component.css',
})
export class DomainRelationsCharactersComponent {
  readonly rows = input.required<BookRelationCharacter[]>();
  readonly currentSheet = input.required<DomainSheet>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly isAddingEntry = input(false);
  readonly closeEntry = output<void>();

  readonly editingId = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly newSourceCharacterId = signal('');
  readonly newTargetCharacterId = signal('');
  readonly newRelationType = signal('');
  readonly newDirected = signal(true);
  readonly newDescription = signal('');
  readonly newColor = signal('#D4A373');
  readonly newPage = signal('');
  readonly newTags = signal<string[]>([]);

  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;

  private readonly domainDataService = inject(DomainDataService);
  private readonly globalErrorService = inject(GlobalErrorService);
  private readonly transloco = inject(TranslocoService);
  private readonly taxonomyService = inject(TaxonomyService);

  readonly characters = computed<CharacterRow[]>(() => {
    const characterSheet = this.domainDataService
      .sheets()
      .find((sheet) => sheet.name.toUpperCase() === 'CHARACTER');
    return (characterSheet?.rows ?? []) as unknown as CharacterRow[];
  });

  readonly invalidTagsDetected = computed(() =>
    this.splitTags(this.newTags()).filter((tag) => !this.taxonomyService.isTagAllowed(tag)),
  );
  readonly relationTypeSuggestions = computed(() => getRelationTypeSuggestions(this.rows()));

  readonly isFormInvalid = computed(() => {
    const characterIds = new Set(this.characters().map((character) => character.id));
    const sourceId = this.newSourceCharacterId();
    const targetId = this.newTargetCharacterId();
    return (
      !characterIds.has(sourceId) ||
      !characterIds.has(targetId) ||
      sourceId === targetId ||
      !this.newRelationType().trim() ||
      !this.newDescription().trim() ||
      this.newDescription().length > 1000 ||
      !this.bookName().trim() ||
      !this.bookAuthor().trim() ||
      this.invalidTagsDetected().length > 0
    );
  });

  readonly filteredRows = computed(() => {
    const query = this.normalizeSearch(this.searchTerm());
    if (!query) {
      return this.rows();
    }

    return this.rows().filter((relation) =>
      [
        this.characterName(relation.sourceCharacterId),
        this.characterName(relation.targetCharacterId),
        relation.relationType,
        relation.description,
        relation.book,
        relation.author,
        relation.page,
        ...relation.tags,
      ].some((value) => this.normalizeSearch(value).includes(query)),
    );
  });

  splitTags(value: string[]): string[] {
    return parseTags(value);
  }

  characterName(id: string): string {
    return this.characters().find((character) => character.id === id)?.name ?? id;
  }

  async deleteEntry(id: string): Promise<void> {
    if (!window.confirm(this.transloco.translate('COMMON.CONFIRM_DELETE'))) {
      return;
    }

    try {
      await this.domainDataService.deleteDomainRow(this.currentSheet().name, id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete character relation.';
      this.globalErrorService.show(message);
    }
  }

  editEntry(relation: BookRelationCharacter): void {
    this.editingId.set(relation.id);
    this.newSourceCharacterId.set(relation.sourceCharacterId);
    this.newTargetCharacterId.set(relation.targetCharacterId);
    this.newRelationType.set(relation.relationType);
    this.newDirected.set(relation.directed);
    this.newDescription.set(relation.description);
    this.newColor.set(relation.color);
    this.newPage.set(relation.page);
    this.newTags.set(relation.tags);
  }

  async addRelation(): Promise<void> {
    if (this.isFormInvalid()) {
      return;
    }

    const sourceCharacterId = this.newSourceCharacterId();
    const targetCharacterId = this.newTargetCharacterId();
    const relationType = this.newRelationType().trim();
    const directed = this.newDirected();
    const description = this.newDescription().trim();
    const color = this.newColor();
    const book = this.bookName().trim();
    const author = this.bookAuthor().trim();
    const page = this.newPage().trim();
    const tags = serializeTags(this.newTags());
    const editingId = this.editingId();
    const originalRow = editingId ? this.rows().find((row) => row.id === editingId) : undefined;

    if (editingId && !originalRow) {
      this.globalErrorService.show('The character relation is no longer available.');
      return;
    }

    const newRow: BookRelationCharacter = {
      ...(originalRow ?? {}),
      id: editingId ?? `relations_characters_${Date.now()}`,
      row: originalRow?.row ?? this.rows().length + 1,
      sourceCharacterId,
      targetCharacterId,
      relationType,
      directed,
      description,
      color,
      book,
      author,
      page,
      tags,
      feed: 5,
      contributor: 'currentUser',
      syncStatus: 'pending',
    };

    const allLocalRows = editingId
      ? this.rows().map((row) => (row.id === editingId ? newRow : row))
      : [...this.rows(), newRow];

    try {
      await this.domainDataService.updateDomainSheetRows(
        this.currentSheet().name,
        allLocalRows,
        true,
        editingId ?? undefined,
        editingId ? undefined : newRow.id,
      );
      this.resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save character relation.';
      this.globalErrorService.show(message);
    }
  }

  resetForm(): void {
    this.editingId.set(null);
    this.newSourceCharacterId.set('');
    this.newTargetCharacterId.set('');
    this.newRelationType.set('');
    this.newDirected.set(true);
    this.newDescription.set('');
    this.newColor.set('#D4A373');
    this.newPage.set('');
    this.newTags.set([]);
    this.closeEntry.emit();
  }

  private normalizeSearch(value: string): string {
    return value.trim().toLocaleLowerCase();
  }
}
