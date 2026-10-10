import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { DomainDataService } from '../../catalog-detail/services/domain-data.service';
import {
  CharacterRole,
  CharacterRow,
  DomainSheet,
} from '../../catalog-detail/models/domain-sheet.model';
import { TagPickerComponent } from '../../../shared/tag-picker.component';

export type { CharacterRole, CharacterRow } from '../../catalog-detail/models/domain-sheet.model';

const CHARACTER_ROLES: CharacterRole[] = [
  'protagonist',
  'antagonist',
  'supporting',
  'historical',
  'mythical',
];

const LEGACY_ROLE_KEYS: Record<string, CharacterRole> = {
  Protagonista: 'protagonist',
  Antagonista: 'antagonist',
  Secundario: 'supporting',
  Histórico: 'historical',
  Mítico: 'mythical',
};

@Component({
  selector: 'app-character',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, TagPickerComponent],
  templateUrl: './character.component.html',
  styleUrls: ['./character.component.css'],
})
export class CharacterComponent {
  readonly rows = input.required<CharacterRow[]>();
  readonly currentSheet = input.required<DomainSheet>();
  readonly bookName = input<string>('');
  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();
  readonly relationsRequested = output<CharacterRow>();

  readonly characterRoles = CHARACTER_ROLES;
  readonly newName = signal<string>('');
  readonly newRole = signal<CharacterRole>('protagonist');
  readonly newDescription = signal<string>('');
  readonly newArchetype = signal<string>('');
  readonly newSource = signal<string>('');
  readonly newTags = signal<string>('');
  readonly searchTerm = signal<string>('');

  readonly source = computed(() => this.newSource().trim() || this.bookName().trim());
  readonly descriptionMaxLength = 400;
  readonly descriptionCharactersRemaining = computed(
    () => this.descriptionMaxLength - this.newDescription().length,
  );

  readonly filteredRows = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    if (!query) {
      return this.rows();
    }

    return this.rows().filter((row) =>
      [row.name, row.role, row.description ?? '', row.archetype ?? '', row.tags ?? ''].some(
        (value) => value.toLocaleLowerCase().includes(query),
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

  roleTranslationKey(role: string): string {
    const roleKey = LEGACY_ROLE_KEYS[role] ?? role;
    return `DOMAINS.CHARACTERS.ROLE_OPTIONS.${roleKey}`;
  }

  viewRelations(row: CharacterRow): void {
    this.relationsRequested.emit(row);
  }

  resetForm(): void {
    this.newName.set('');
    this.newRole.set('protagonist');
    this.newDescription.set('');
    this.newArchetype.set('');
    this.newSource.set('');
    this.newTags.set('');
    this.closeEntry.emit();
  }

  async addCharacter(): Promise<void> {
    const name = this.newName().trim();
    const role = this.newRole();
    const description = this.newDescription().trim();
    const archetype = this.newArchetype().trim();
    const source = this.source();
    const tags = this.splitTags(this.newTags()).join(' ');

    if (!name) {
      return;
    }

    const newRow: CharacterRow = {
      id: `character_${Date.now()}`,
      name,
      role,
      ...(description ? { description } : {}),
      ...(archetype ? { archetype } : {}),
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
      const message = error instanceof Error ? error.message : 'Failed to add character.';
      this.globalErrorService.show(message);
    }
  }
}
