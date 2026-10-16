import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { DomainDataService } from '../../catalog-detail/services/domain-data.service';
import { DomainSheet } from '../../catalog-detail/models/domain-sheet.model';
import { TagPickerComponent } from '../../../shared/tag-picker.component';
import { CharacterNature, CharacterRole, CharacterRow } from '../models/domain-character-row.model'; 
import { TaxonomyService } from '../../../core/services/taxonomy/taxonomy.service';
import { PermissionService } from '../../../core/services/permission.service';

const CHARACTER_ROLES: CharacterRole[] = [
  'protagonist',
  'antagonist',
  'supporting',
  'historical',
  'mythical',
];

const CHARACTER_NATURES: CharacterNature[] = [
  'historical',
  'fictitious',
  'inspired',
];

@Component({
  selector: 'app-domain-character',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, TagPickerComponent],
  templateUrl: './domain-character.component.html',
  styleUrls: ['./domain-character.component.css'],
})
export class DomainCharacterComponent {
  readonly rows = input.required<CharacterRow[]>();
  readonly currentSheet = input.required<DomainSheet>();
  readonly bookName = input<string>('');
  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();
  readonly relationsRequested = output<CharacterRow>();

  readonly characterRoles = CHARACTER_ROLES;
  readonly characterNatures = CHARACTER_NATURES;
  readonly newName = signal<string>('');
  readonly newRole = signal<CharacterRole>('protagonist');
  readonly newNature = signal<CharacterNature>('historical');
  readonly newDescription = signal<string>('');
  readonly newArchetype = signal<string>('');
  readonly newSource = signal<string>('');
  readonly newColor = signal<string>('#3b82f6');
  readonly newTags = signal<string>('');
  readonly searchTerm = signal<string>('');
  readonly editingId = signal<string | null>(null);

  readonly source = computed(() => this.newSource().trim() || this.bookName().trim());
  readonly descriptionMaxLength = 400;
  readonly descriptionCharactersRemaining = computed(
    () => this.descriptionMaxLength - this.newDescription().length,
  );

  private domainDataService = inject(DomainDataService);
  private globalErrorService = inject(GlobalErrorService);
  private readonly transloco = inject(TranslocoService);
  private readonly taxonomyService = inject(TaxonomyService);
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;

  /**
   * 1. REAL-TIME SIGNAL VALIDATION GUARD
   * Monitors newTags() string alterations and builds a list of unlisted system entries.
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
   * 2. EXPLICIT FORM INHERENT VALIDATION CAP
   * Returns true if form states fulfill all system safety checks.
   */
  readonly isFormInvalid = computed<boolean>(() => {
    return !this.newName().trim() || this.invalidTagsDetected().length > 0;
  });

  readonly filteredRows = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    if (!query) {
      return this.rows();
    }

    return this.rows().filter((row) =>
      [
        row.name,
        row.role,
        row.nature ?? '',
        row.color ?? '',
        row.description ?? '',
        row.archetype ?? '',
        row.tags ?? '',
      ].some((value) => value.toLocaleLowerCase().includes(query)),
    );
  });

  splitTags(tags: string): string[] {
    return tags
      .split(/[\s,;]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  viewRelations(row: CharacterRow): void {
    this.relationsRequested.emit(row);
  }

  async deleteEntry(id: string): Promise<void> {
    if (!window.confirm(this.transloco.translate('COMMON.CONFIRM_DELETE'))) {
      return;
    }

    try {
      await this.domainDataService.deleteDomainRow(this.currentSheet().name, id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete character.';
      this.globalErrorService.show(message);
    }
  }

  editEntry(row: CharacterRow): void {
    this.editingId.set(row.id);
    this.newName.set(row.name);
    this.newRole.set(row.role);
    this.newNature.set(row.nature ?? 'historical');
    this.newDescription.set(row.description ?? '');
    this.newArchetype.set(row.archetype ?? '');
    this.newSource.set(row.source ?? '');
    this.newColor.set(row.color ?? '#3b82f6');
    this.newTags.set(row.tags ?? '');
  }

  resetForm(): void {
    this.editingId.set(null);
    this.newName.set('');
    this.newRole.set('protagonist');
    this.newNature.set('historical');
    this.newDescription.set('');
    this.newArchetype.set('');
    this.newSource.set('');
    this.newTags.set('');
    this.newColor.set('#3b82f6');
    this.closeEntry.emit();
  }

  async addCharacter(): Promise<void> {
    // Hard-block execution if validation rules are violated
    if (this.isFormInvalid()) {
      this.globalErrorService.show('Cannot add entry: Please remove unauthorized tags.');
      return;
    }

    const name = this.newName().trim();
    const role = this.newRole();
    const nature = this.newNature();
    const color = this.newColor();
    const description = this.newDescription().trim();
    const archetype = this.newArchetype().trim();
    const source = this.source();
    const tags = this.splitTags(this.newTags()).join(' ');
    const editingId = this.editingId();

    try {
      const localRows = editingId
        ? ((await this.domainDataService.getLocalDomainSheetRows(this.currentSheet().name)) as CharacterRow[])
        : this.rows();
      const existingRows = localRows.length > 0 ? localRows : this.rows();
      const originalRow = editingId
        ? existingRows.find((row) => row.id === editingId)
        : undefined;
      if (editingId && !originalRow) {
        throw new Error('The character being edited is no longer available.');
      }

      const newRow: CharacterRow = {
        ...(originalRow ?? {}),
        id: editingId ?? `character_${Date.now()}`,
        name,
        role,
        nature,
        color,
        description: description || undefined,
        archetype: archetype || undefined,
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
      const message = error instanceof Error ? error.message : 'Failed to add character.';
      this.globalErrorService.show(message);
    }
  }
}
