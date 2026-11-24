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
import { ConceptRecord } from '../../concepts/model/concepts-model';
import { AssociationEntryCardComponent } from '../components/association-entry-card/association-entry-card.component';
import { AssociationEntryFormComponent } from '../components/association-entry-form/association-entry-form.component';
import {
  ASSOCIATION_DEFAULT_COLOR,
  ASSOCIATION_DEFAULT_FEED,
  AssociationRecord,
  getAssociationTypeSuggestions,
} from '../model/associations-model';
import { AssociationDataService } from '../services/associations.service';

@Component({
  selector: 'app-domain-associations-1',
  imports: [
    FormsModule,
    TranslocoPipe,
    AssociationEntryFormComponent,
    AssociationEntryCardComponent,
  ],
  templateUrl: './associations.component.html',
  styleUrl: './associations.component.css',
})
export class AssociationsComponent implements OnInit {
  readonly bookId = input.required<string>();
  readonly isAddingEntry = input(false);
  readonly closeEntry = output<void>();

  readonly rows = signal<AssociationRecord[]>([]);
  readonly concepts = signal<ConceptRecord[]>([]);
  readonly bookName = signal('');
  readonly bookAuthor = signal('');
  readonly bookRow = signal<number | null>(null);
  private readonly allowedTags = signal<ReadonlySet<string>>(new Set());

  readonly editingId = signal<string | null>(null);
  readonly searchTerm = inject(StudySearchService).query;
  readonly newSourceConceptId = signal('');
  readonly newTargetConceptId = signal('');
  readonly newRelationType = signal('');
  readonly newDirected = signal(true);
  readonly newDescription = signal('');
  readonly newColor = signal(ASSOCIATION_DEFAULT_COLOR);
  readonly newPage = signal('');
  readonly newTags = signal<string[]>([]);
  readonly optionsLoadState = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  readonly isSaving = signal(false);

  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;
  private readonly associationDataService = inject(AssociationDataService);
  private readonly globalErrorService = inject(GlobalErrorService);
  private readonly transloco = inject(TranslocoService);

  readonly invalidTagsDetected = computed(() => {
    const allowed = this.allowedTags();
    return parseTagsFromArray(this.newTags()).filter(
      (tag) => !allowed.has(normalizeTagsFromArray([tag])[0]),
    );
  });

  readonly relationTypeSuggestions = computed(() => getAssociationTypeSuggestions(this.rows()));

  readonly isFormInvalid = computed(() => {
    const conceptIds = new Set(this.concepts().map((concept) => concept.id));
    const sourceId = this.newSourceConceptId();
    const targetId = this.newTargetConceptId();
    return (
      !conceptIds.has(sourceId) ||
      !conceptIds.has(targetId) ||
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
    const query = this.searchTerm().trim();
    const bookName = this.bookName();
    const bookAuthor = this.bookAuthor();

    return this.rows().filter(
      (association) =>
        !query ||
        matchesStudySearch(
          query,
          [
            bookName,
            bookAuthor,
            'associations',
            'asociaciones',
            this.conceptName(association.sourceConceptId),
            this.conceptName(association.targetConceptId),
            association.relationType,
            association.description,
            association.book,
            association.author,
            association.page,
            association.contributor,
            ...association.tags,
          ],
          association.tags,
          {
            book: bookName || association.book,
            author: bookAuthor || association.author,
            contributor: association.contributor,
          },
        ),
    );
  });

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

      untracked(() => void this.loadConceptOptions());
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const book = await this.associationDataService.getBookRecord(this.bookId());
      this.bookName.set(book?.name ?? '');
      this.bookAuthor.set(book?.author ?? '');
      this.bookRow.set(book?.row ?? null);
      await this.refreshAllowedTags();
      this.rows.set(await this.associationDataService.getRecords(this.bookId()));
      await this.loadConceptOptions();
    } catch (error) {
      this.showError(error, 'Failed to load associations.');
    }
  }

  async refreshAllowedTags(): Promise<void> {
    try {
      const tags = await this.associationDataService.getAllowedTags(this.bookId());
      this.allowedTags.set(new Set(normalizeTagsFromArray(tags)));
    } catch (error) {
      this.showError(error, 'Failed to load book tags.');
    }
  }

  conceptName(id: string): string {
    return this.concepts().find((concept) => concept.id === id)?.term ?? id;
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
      await this.associationDataService.deleteDomainItem(record);
      this.rows.update((rows) => rows.filter((row) => row.id !== id));
    } catch (error) {
      this.showError(error, 'Failed to delete concept association.');
    }
  }

  editEntry(record: AssociationRecord): void {
    this.editingId.set(record.id);
    this.newSourceConceptId.set(record.sourceConceptId);
    this.newTargetConceptId.set(record.targetConceptId);
    this.newRelationType.set(record.relationType);
    this.newDirected.set(record.directed);
    this.newDescription.set(record.description);
    this.newColor.set(record.color);
    this.newPage.set(record.page);
    this.newTags.set(record.tags);
    void this.refreshAllowedTags();
  }

  resetForm(): void {
    this.editingId.set(null);
    this.newSourceConceptId.set('');
    this.newTargetConceptId.set('');
    this.newRelationType.set('');
    this.newDirected.set(true);
    this.newDescription.set('');
    this.newColor.set(ASSOCIATION_DEFAULT_COLOR);
    this.newPage.set('');
    this.newTags.set([]);
    this.closeEntry.emit();
  }

  async saveAssociation(): Promise<void> {
    if (this.isSaving()) {
      return;
    }
    if (this.isFormInvalid()) {
      this.globalErrorService.show('Cannot save association: Check the fields and book tags.');
      return;
    }

    const editingId = this.editingId();
    const original = editingId ? this.rows().find((row) => row.id === editingId) : undefined;
    if (editingId && !original) {
      this.globalErrorService.show('The association being edited is no longer available.');
      return;
    }

    const bookRow = this.bookRow() ?? original?.bookRow;
    if (!bookRow) {
      this.globalErrorService.show('Book record is missing row.');
      return;
    }

    const record: AssociationRecord = {
      id: editingId ?? `associations_${Date.now()}`,
      bookId: this.bookId(),
      bookRow,
      itemRow: original?.itemRow ?? 0,
      sourceConceptId: this.newSourceConceptId(),
      targetConceptId: this.newTargetConceptId(),
      relationType: this.newRelationType().trim(),
      directed: this.newDirected(),
      description: this.newDescription().trim(),
      color: this.newColor(),
      book: this.bookName().trim(),
      author: this.bookAuthor().trim(),
      page: this.newPage().trim(),
      tags: normalizeTagsFromArray(this.newTags()),
      feed: original?.feed ?? ASSOCIATION_DEFAULT_FEED,
      contributor: original?.contributor ?? '',
      syncStatus: 'pending',
    };

    this.isSaving.set(true);
    try {
      const saved = editingId
        ? await this.associationDataService.updateDomainItem(record)
        : await this.associationDataService.addDomainItem(record);
      this.rows.update((rows) => {
        const index = rows.findIndex((row) => row.id === record.id);
        return index === -1
          ? [...rows, saved]
          : rows.map((row, rowIndex) => (rowIndex === index ? saved : row));
      });
      this.resetForm();
    } catch (error) {
      this.showError(error, 'Failed to save association.');
    } finally {
      this.isSaving.set(false);
    }
  }

  private async loadConceptOptions(): Promise<void> {
    if (this.optionsLoadState() === 'loading' || this.optionsLoadState() === 'ready') {
      return;
    }
    this.optionsLoadState.set('loading');
    try {
      this.concepts.set(await this.associationDataService.getConcepts(this.bookId()));
      this.optionsLoadState.set('ready');
    } catch {
      this.optionsLoadState.set('error');
    }
  }

  private showError(error: unknown, fallback: string): void {
    this.globalErrorService.show(error instanceof Error ? error.message : fallback);
  }
}
