import {
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../../core/services/error/global-error.service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { StudySearchService } from '../../../../core/services/search/study-search.service';
import {
  normalizeTagsFromArray,
  parseTagsFromArray,
} from '../../../../shared/tag-picker/tag-picker.mapper';
import { matchesStudySearch } from '../../../../shared/utils/study-search';
import { CharacterEntryCardComponent } from '../components/character-entry-card/character-entry-card.component';
import { CharacterEntryFormComponent } from '../components/character-entry-form/character-entry-form.component';
import {
  CHARACTER_DEFAULT_FEED,
  CHARACTER_NATURES,
  CHARACTER_ROLES,
  CharacterNature,
  CharacterRecord,
  CharacterRole,
} from '../model/characters-model';
import { CharacterDataService } from '../services/characters.service';
import { GlobalLoadingService } from '../../../../core/services/loading/global-loading.service';

@Component({
  selector: 'app-domain-characters-1',
  imports: [FormsModule, TranslocoPipe, CharacterEntryFormComponent, CharacterEntryCardComponent],
  templateUrl: './characters.component.html',
  styleUrl: './characters.component.css',
})
export class CharactersComponent implements OnInit {
  readonly bookId = input.required<string>();
  readonly isAddingEntry = input(false);
  readonly closeEntry = output<void>();

  readonly rows = signal<CharacterRecord[]>([]);
  readonly bookName = signal('');
  readonly bookAuthor = signal('');
  readonly bookRow = signal<number | null>(null);
  private readonly allowedTags = signal<ReadonlySet<string>>(new Set());

  readonly characterRoles = CHARACTER_ROLES;
  readonly characterNatures = CHARACTER_NATURES;
  readonly newName = signal('');
  readonly newRole = signal<CharacterRole>('protagonist');
  readonly newNature = signal<CharacterNature>('historical');
  readonly newDescription = signal('');
  readonly newArchetype = signal('');
  readonly newSource = signal('');
  readonly newColor = signal('#3b82f6');
  readonly newTags = signal<string[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly isSaving = signal(false);
  readonly searchTerm = inject(StudySearchService).query;
  readonly descriptionMaxLength = 400;
  readonly descriptionCharactersRemaining = computed(
    () => this.descriptionMaxLength - this.newDescription().length,
  );

  readonly source = computed(() => this.newSource().trim() || this.bookName().trim());
  private readonly characterDataService = inject(CharacterDataService);
  private readonly globalLoadingService = inject(GlobalLoadingService);
  private readonly globalErrorService = inject(GlobalErrorService);
  private readonly transloco = inject(TranslocoService);
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;

  readonly invalidTagsDetected = computed(() => {
    const allowed = this.allowedTags();
    return parseTagsFromArray(this.newTags()).filter(
      (tag) => !allowed.has(normalizeTagsFromArray([tag])[0]),
    );
  });

  readonly isFormInvalid = computed(
    () => !this.newName().trim() || this.invalidTagsDetected().length > 0,
  );

  readonly filteredRows = computed(() => {
    const query = this.searchTerm().trim();
    const bookName = this.bookName();
    const bookAuthor = this.bookAuthor();

    return this.rows().filter(
      (row) =>
        !query ||
        matchesStudySearch(
          query,
          [
            bookName,
            bookAuthor,
            'characters',
            'personajes',
            row.name,
            row.role,
            row.nature ?? '',
            row.color ?? '',
            row.description ?? '',
            row.archetype ?? '',
            row.source ?? '',
            row.contributor,
            ...row.tags,
          ],
          row.tags,
          { book: bookName, author: bookAuthor, contributor: row.contributor },
        ),
    );
  });

  constructor() {
    effect(() => {
      if (this.isAddingEntry()) {
        untracked(() => void this.refreshAllowedTags());
      }
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const book = await this.characterDataService.getBookRecord(this.bookId());
      this.bookName.set(book?.name ?? '');
      this.bookAuthor.set(book?.author ?? '');
      this.bookRow.set(book?.row ?? null);
      await this.refreshAllowedTags();
      this.rows.set(await this.characterDataService.getRecords(this.bookId()));
    } catch (error) {
      this.showError(error, 'Failed to load characters.');
    }
  }

  async refreshAllowedTags(): Promise<void> {
    try {
      const tags = await this.characterDataService.getAllowedTags(this.bookId());
      this.allowedTags.set(new Set(normalizeTagsFromArray(tags)));
    } catch (error) {
      this.showError(error, 'Failed to load book tags.');
    }
  }

  async deleteEntry(id: string): Promise<void> {
    if (!window.confirm(this.transloco.translate('COMMON.CONFIRM_DELETE'))) {
      return;
    }

    const record = this.rows().find((row) => row.id === id);
    if (!record) {
      return;
    }

    try {
      await this.characterDataService.deleteDomainItem(record);
      this.rows.update((rows) => rows.filter((row) => row.id !== id));
    } catch (error) {
      this.showError(error, 'Failed to delete character.');
    }
  }

  editEntry(record: CharacterRecord): void {
    this.submitted.set(false);
    this.editingId.set(record.id);
    this.newName.set(record.name);
    this.newRole.set(record.role);
    this.newNature.set(record.nature ?? 'historical');
    this.newDescription.set(record.description ?? '');
    this.newArchetype.set(record.archetype ?? '');
    this.newSource.set(record.source ?? '');
    this.newColor.set(record.color ?? '#3b82f6');
    this.newTags.set(record.tags);
    void this.refreshAllowedTags();
  }

  resetForm(): void {
    this.submitted.set(false);
    this.editingId.set(null);
    this.newName.set('');
    this.newRole.set('protagonist');
    this.newNature.set('historical');
    this.newDescription.set('');
    this.newArchetype.set('');
    this.newSource.set('');
    this.newColor.set('#3b82f6');
    this.newTags.set([]);
    this.closeEntry.emit();
  }

  async saveCharacter(): Promise<void> {
    this.submitted.set(true);
    if (this.isSaving() || this.isFormInvalid()) {
      return;
    }

    const editingId = this.editingId();
    const original = editingId ? this.rows().find((row) => row.id === editingId) : undefined;
    if (editingId && !original) {
      this.globalErrorService.show('The character being edited is no longer available.');
      return;
    }

    const bookRow = this.bookRow() ?? original?.bookRow;
    if (!bookRow) {
      this.globalErrorService.show('Book record is missing row.');
      return;
    }

    const operation = this.globalLoadingService.begin();

    const record: CharacterRecord = {
      id: editingId ?? `character_${Date.now()}`,
      bookId: this.bookId(),
      bookRow,
      itemRow: original?.itemRow ?? 0,
      name: this.newName().trim(),
      role: this.newRole(),
      nature: this.newNature(),
      description: this.newDescription().trim() || undefined,
      archetype: this.newArchetype().trim() || undefined,
      color: this.newColor(),
      source: this.source() || undefined,
      tags: normalizeTagsFromArray(this.newTags()),
      feed: original?.feed ?? CHARACTER_DEFAULT_FEED,
      contributor: original?.contributor ?? '',
      syncStatus: 'pending',
    };

    this.isSaving.set(true);
    try {
      const saved = editingId
        ? await this.characterDataService.updateDomainItem(record)
        : await this.characterDataService.addDomainItem(record);
      this.rows.update((rows) => {
        const index = rows.findIndex((row) => row.id === record.id);
        return index === -1
          ? [...rows, saved]
          : rows.map((row, rowIndex) => (rowIndex === index ? saved : row));
      });
      this.resetForm();
    } catch (error) {
      this.showError(error, 'Failed to save character.');
    } finally {
      this.isSaving.set(false);
      this.globalLoadingService.end(operation);
    }
  }

  private showError(error: unknown, fallback: string): void {
    this.globalErrorService.show(error instanceof Error ? error.message : fallback);
  }
}
