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
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { GlobalLoadingService } from '../../../../core/services/loading/global-loading.service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { StudySearchService } from '../../../../core/services/search/study-search.service';
import {
  normalizeTagsFromArray,
  parseTagsFromArray,
} from '../../../../shared/tag-picker/tag-picker.mapper';
import { matchesStudySearch } from '../../../../shared/utils/study-search';
import { ConceptEntryCardComponent } from '../components/concept-entry-card/concept-entry-card.component';
import { ConceptEntryFormComponent } from '../components/concept-entry-form/concept-entry-form.component';
import {
  CONCEPT_DEFAULT_FEED,
  CONCEPT_NODE_CATEGORIES,
  ConceptRecord,
  isConceptNodeCategory,
} from '../model/concepts-model';
import { ConceptDataService } from '../services/concepts.service';

@Component({
  selector: 'app-domain-concepts',
  imports: [FormsModule, TranslocoPipe, ConceptEntryFormComponent, ConceptEntryCardComponent],
  templateUrl: './concepts.component.html',
  styleUrls: ['./concepts.component.css'],
})
export class ConceptsComponent implements OnInit {
  /** Domain components only receive the book ID and manage their own entries. */
  readonly bookId = input.required<string>();
  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();

  // Unfiltered local source of truth for this book.
  readonly rows = signal<ConceptRecord[]>([]);
  readonly bookName = signal('');
  readonly bookAuthor = signal('');
  readonly bookRow = signal<number | null>(null);
  private readonly allowedTags = signal<ReadonlySet<string>>(new Set());

  readonly nodeCategories = CONCEPT_NODE_CATEGORIES;
  readonly newTerm = signal('');
  readonly newDefinition = signal('');
  readonly newCategory = signal('');
  readonly customCategory = signal('');
  readonly newSource = signal('');
  readonly newTags = signal<string[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly isSaving = signal(false);
  readonly searchTerm = inject(StudySearchService).query;
  readonly definitionMaxLength = 400;
  readonly definitionCharactersRemaining = computed(
    () => this.definitionMaxLength - this.newDefinition().length,
  );

  private readonly conceptDataService = inject(ConceptDataService);
  private readonly globalLoadingService = inject(GlobalLoadingService);
  private readonly globalMessageService = inject(GlobalMessageService);
  private readonly transloco = inject(TranslocoService);
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;

  /** Tags typed in the form that are not part of the book's INDEX taxonomy. */
  readonly invalidTagsDetected = computed<string[]>(() => {
    const allowed = this.allowedTags();
    return parseTagsFromArray(this.newTags()).filter(
      (tag) => !allowed.has(normalizeTagsFromArray([tag])[0]),
    );
  });

  readonly isFormInvalid = computed<boolean>(
    () =>
      !this.newTerm().trim() ||
      !this.newDefinition().trim() ||
      this.invalidTagsDetected().length > 0,
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
            'concepts',
            'conceptos',
            row.term,
            row.definition,
            row.category,
            row.source,
            row.contributor,
            ...row.tags,
          ],
          row.tags,
          { book: bookName, author: bookAuthor, contributor: row.contributor },
        ),
    );
  });

  constructor() {
    // Opening the form must see the latest INDEX tags.
    effect(() => {
      if (this.isAddingEntry()) {
        untracked(() => void this.refreshAllowedTags());
      }
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const book = await this.conceptDataService.getBookRecord(this.bookId());
      this.bookName.set(book?.name ?? '');
      this.bookAuthor.set(book?.author ?? '');
      this.bookRow.set(book?.row ?? null);
      this.newSource.set(this.bookName());

      await this.refreshAllowedTags();
      this.rows.set(await this.conceptDataService.getRecords(this.bookId()));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load concepts.';
      this.globalMessageService.showError(message);
    }
  }

  async refreshAllowedTags(): Promise<void> {
    try {
      const tags = await this.conceptDataService.getAllowedTags(this.bookId());
      this.allowedTags.set(new Set(normalizeTagsFromArray(tags)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load book tags.';
      this.globalMessageService.showError(message);
    }
  }

  async deleteEntry(id: string): Promise<void> {
    if (!window.confirm(this.transloco.translate('COMMON.CONFIRM_DELETE'))) {
      return;
    }

    const row = this.rows().find((item) => item.id === id);
    if (!row) {
      return;
    }

    try {
      await this.conceptDataService.deleteDomainItem(row);
      this.rows.update((rows) => rows.filter((item) => item.id !== id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete concept.';
      this.globalMessageService.showError(message);
    }
  }

  editEntry(row: ConceptRecord): void {
    this.submitted.set(false);
    const category = row.category;
    const isBuiltInCategory = isConceptNodeCategory(category);

    this.editingId.set(row.id);
    this.newTerm.set(row.term);
    this.newDefinition.set(row.definition);
    this.newCategory.set(isBuiltInCategory ? category : category ? 'other' : '');
    this.customCategory.set(isBuiltInCategory ? '' : category);
    this.newSource.set(row.source);
    this.newTags.set(row.tags);
    void this.refreshAllowedTags();
  }

  resetForm(): void {
    this.submitted.set(false);
    this.editingId.set(null);
    this.newTerm.set('');
    this.newDefinition.set('');
    this.newCategory.set('');
    this.customCategory.set('');
    this.newSource.set(this.bookName());
    this.newTags.set([]);
    this.closeEntry.emit();
  }

  async saveConcept(): Promise<void> {
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
      this.globalMessageService.showError('The concept being edited is no longer available.');
      return;
    }

    const bookRow = this.bookRow() ?? original?.bookRow;
    if (!bookRow) {
      this.globalMessageService.showError('Book record is missing row.');
      return;
    }

    const selectedCategory = this.newCategory();
    const record: ConceptRecord = {
      id: editingId ?? `concept_${Date.now()}`,
      bookId: this.bookId(),
      bookRow,
      itemRow: original?.itemRow ?? 0,
      term: this.newTerm().trim(),
      definition: this.newDefinition().trim(),
      category: selectedCategory === 'other' ? this.customCategory().trim() : selectedCategory,
      source: this.newSource().trim() || this.bookName().trim(),
      tags: normalizeTagsFromArray(this.newTags()),
      feed: original?.feed ?? CONCEPT_DEFAULT_FEED,
      contributor: original?.contributor ?? '',
      syncStatus: 'pending',
    };

    const operation = this.globalLoadingService.begin();
    this.isSaving.set(true);
    try {
      const saved = editingId
        ? await this.conceptDataService.updateDomainItem(record)
        : await this.conceptDataService.addDomainItem(record);
      this.rows.update((rows) => {
        const existingIndex = rows.findIndex((row) => row.id === record.id);
        if (existingIndex === -1) {
          return [...rows, saved];
        }
        return rows.map((row, index) => (index === existingIndex ? saved : row));
      });
      this.resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save concept.';
      this.globalMessageService.showError(message);
    } finally {
      this.isSaving.set(false);
      this.globalLoadingService.end(operation);
    }
  }
}
