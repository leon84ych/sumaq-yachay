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
import { GlobalLoadingService } from '../../../../core/services/loading/global-loading.service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { StudySearchService } from '../../../../core/services/search/study-search.service';
import {
  normalizeTagsFromArray,
  parseTagsFromArray,
} from '../../../../shared/tag-picker/tag-picker.mapper';
import { matchesStudySearch } from '../../../../shared/utils/study-search';
import { CharacterRecord } from '../../characters/model/characters-model';
import { RelationEntryCardComponent } from '../components/relation-entry-card/relation-entry-card.component';
import { RelationEntryFormComponent } from '../components/relation-entry-form/relation-entry-form.component';
import {
  RELATION_DEFAULT_COLOR,
  RELATION_DEFAULT_FEED,
  RelationRecord,
  getRelationTypeSuggestions,
} from '../model/relations-model';
import { RelationDataService } from '../services/relations.service';

@Component({
  selector: 'app-domain-relations-1',
  imports: [FormsModule, TranslocoPipe, RelationEntryFormComponent, RelationEntryCardComponent],
  templateUrl: './relations.component.html',
  styleUrl: './relations.component.css',
})
export class RelationsComponent implements OnInit {
  readonly bookId = input.required<string>();
  readonly isAddingEntry = input(false);
  readonly closeEntry = output<void>();

  readonly rows = signal<RelationRecord[]>([]);
  readonly characters = signal<CharacterRecord[]>([]);
  readonly bookName = signal('');
  readonly bookAuthor = signal('');
  readonly bookRow = signal<number | null>(null);
  private readonly allowedTags = signal<ReadonlySet<string>>(new Set());

  readonly editingId = signal<string | null>(null);
  readonly searchTerm = inject(StudySearchService).query;
  readonly newSourceCharacterId = signal('');
  readonly newTargetCharacterId = signal('');
  readonly newRelationType = signal('');
  readonly newDirected = signal(true);
  readonly newDescription = signal('');
  readonly newColor = signal(RELATION_DEFAULT_COLOR);
  readonly newPage = signal('');
  readonly newTags = signal<string[]>([]);
  readonly optionsLoadState = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  readonly submitted = signal(false);
  readonly isSaving = signal(false);

  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;
  private readonly relationDataService = inject(RelationDataService);
  private readonly globalErrorService = inject(GlobalErrorService);
  private readonly globalLoadingService = inject(GlobalLoadingService);
  private readonly transloco = inject(TranslocoService);

  readonly invalidTagsDetected = computed(() => {
    const allowed = this.allowedTags();
    return parseTagsFromArray(this.newTags()).filter(
      (tag) => !allowed.has(normalizeTagsFromArray([tag])[0]),
    );
  });

  readonly relationTypeSuggestions = computed(() => getRelationTypeSuggestions(this.rows()));
  readonly isSourceCharacterInvalid = computed(
    () => !this.characters().some((character) => character.id === this.newSourceCharacterId()),
  );
  readonly isTargetCharacterInvalid = computed(
    () => !this.characters().some((character) => character.id === this.newTargetCharacterId()),
  );
  readonly isSameCharacterInvalid = computed(
    () =>
      !!this.newSourceCharacterId() && this.newSourceCharacterId() === this.newTargetCharacterId(),
  );
  readonly isRelationTypeInvalid = computed(() => !this.newRelationType().trim());
  readonly isDescriptionInvalid = computed(() => !this.newDescription().trim());
  readonly isBookInvalid = computed(() => !this.bookName().trim());
  readonly isAuthorInvalid = computed(() => !this.bookAuthor().trim());

  readonly isFormInvalid = computed(() => {
    return (
      this.isSourceCharacterInvalid() ||
      this.isTargetCharacterInvalid() ||
      this.isSameCharacterInvalid() ||
      this.isRelationTypeInvalid() ||
      this.isDescriptionInvalid() ||
      this.newDescription().length > 1000 ||
      this.isBookInvalid() ||
      this.isAuthorInvalid() ||
      this.invalidTagsDetected().length > 0
    );
  });

  readonly filteredRows = computed(() => {
    const query = this.searchTerm().trim();
    const bookName = this.bookName();
    const bookAuthor = this.bookAuthor();

    return this.rows().filter(
      (relation) =>
        !query ||
        matchesStudySearch(
          query,
          [
            bookName,
            bookAuthor,
            'relations',
            'relationships',
            'relaciones',
            this.characterName(relation.sourceCharacterId),
            this.characterName(relation.targetCharacterId),
            relation.relationType,
            relation.description,
            relation.book,
            relation.author,
            relation.page,
            relation.contributor,
            ...relation.tags,
          ],
          relation.tags,
          {
            book: bookName || relation.book,
            author: bookAuthor || relation.author,
            contributor: relation.contributor,
          },
        ),
    );
  });

  readonly sourceCharacterName = (id: string): string => this.characterName(id);
  readonly targetCharacterName = (id: string): string => this.characterName(id);

  constructor() {
    effect(() => {
      const formOpen = this.isAddingEntry() || this.editingId() !== null;
      if (!formOpen) {
        if (this.optionsLoadState() === 'error') {
          this.optionsLoadState.set('idle');
        }
        return;
      }

      if (this.optionsLoadState() === 'ready' || this.optionsLoadState() === 'loading') {
        return;
      }

      untracked(() => void this.loadCharacterOptions());
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const book = await this.relationDataService.getBookRecord(this.bookId());
      this.bookName.set(book?.name ?? '');
      this.bookAuthor.set(book?.author ?? '');
      this.bookRow.set(book?.row ?? null);
      await this.refreshAllowedTags();
      this.rows.set(await this.relationDataService.getRecords(this.bookId()));
      await this.loadCharacterOptions();
    } catch (error) {
      this.showError(error, 'Failed to load relations.');
    }
  }

  async refreshAllowedTags(): Promise<void> {
    try {
      const tags = await this.relationDataService.getAllowedTags(this.bookId());
      this.allowedTags.set(new Set(normalizeTagsFromArray(tags)));
    } catch (error) {
      this.showError(error, 'Failed to load book tags.');
    }
  }

  characterName(id: string): string {
    return this.characters().find((character) => character.id === id)?.name ?? id;
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
      await this.relationDataService.deleteDomainItem(record);
      this.rows.update((rows) => rows.filter((row) => row.id !== id));
    } catch (error) {
      this.showError(error, 'Failed to delete character relation.');
    }
  }

  editEntry(record: RelationRecord): void {
    this.submitted.set(false);
    this.editingId.set(record.id);
    this.newSourceCharacterId.set(record.sourceCharacterId);
    this.newTargetCharacterId.set(record.targetCharacterId);
    this.newRelationType.set(record.relationType);
    this.newDirected.set(record.directed);
    this.newDescription.set(record.description);
    this.newColor.set(record.color);
    this.newPage.set(record.page);
    this.newTags.set(record.tags);
    void this.refreshAllowedTags();
  }

  resetForm(): void {
    this.submitted.set(false);
    this.editingId.set(null);
    this.newSourceCharacterId.set('');
    this.newTargetCharacterId.set('');
    this.newRelationType.set('');
    this.newDirected.set(true);
    this.newDescription.set('');
    this.newColor.set(RELATION_DEFAULT_COLOR);
    this.newPage.set('');
    this.newTags.set([]);
    this.closeEntry.emit();
  }

  async saveRelation(): Promise<void> {
    if (this.isSaving()) {
      return;
    }
    this.submitted.set(true);
    if (this.isFormInvalid()) {
      return;
    }

    const editingId = this.editingId();
    const original = editingId ? this.rows().find((row) => row.id === editingId) : undefined;
    if (editingId && !original) {
      this.globalErrorService.show('The relation being edited is no longer available.');
      return;
    }

    const bookRow = this.bookRow() ?? original?.bookRow;
    if (!bookRow) {
      this.globalErrorService.show('Book record is missing row.');
      return;
    }

    const record: RelationRecord = {
      id: editingId ?? `relations_${Date.now()}`,
      bookId: this.bookId(),
      bookRow,
      itemRow: original?.itemRow ?? 0,
      sourceCharacterId: this.newSourceCharacterId(),
      targetCharacterId: this.newTargetCharacterId(),
      relationType: this.newRelationType().trim(),
      directed: this.newDirected(),
      description: this.newDescription().trim(),
      color: this.newColor(),
      book: this.bookName().trim(),
      author: this.bookAuthor().trim(),
      page: this.newPage().trim(),
      tags: normalizeTagsFromArray(this.newTags()),
      feed: original?.feed ?? RELATION_DEFAULT_FEED,
      contributor: original?.contributor ?? '',
      syncStatus: 'pending',
    };

    const operation = this.globalLoadingService.begin();
    this.isSaving.set(true);
    try {
      const saved = editingId
        ? await this.relationDataService.updateDomainItem(record)
        : await this.relationDataService.addDomainItem(record);
      this.rows.update((rows) => {
        const index = rows.findIndex((row) => row.id === record.id);
        return index === -1
          ? [...rows, saved]
          : rows.map((row, rowIndex) => (rowIndex === index ? saved : row));
      });
      this.resetForm();
    } catch (error) {
      this.showError(error, 'Failed to save relation.');
    } finally {
      this.isSaving.set(false);
      this.globalLoadingService.end(operation);
    }
  }

  private async loadCharacterOptions(): Promise<void> {
    this.optionsLoadState.set('loading');
    try {
      this.characters.set(await this.relationDataService.getCharacters(this.bookId()));
      this.optionsLoadState.set('ready');
    } catch {
      this.optionsLoadState.set('error');
    }
  }

  private showError(error: unknown, fallback: string): void {
    this.globalErrorService.show(error instanceof Error ? error.message : fallback);
  }
}
