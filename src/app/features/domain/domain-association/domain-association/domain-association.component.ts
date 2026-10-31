import { CommonModule } from '@angular/common';
import {
  Component,
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
import { GlobalErrorService } from '../../../../core/services/global-error.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { TaxonomyService } from '../../../../core/services/taxonomy/taxonomy.service';
import { parseTagsFromArray, serializeTagsToArray } from '../../../../shared/utils/tag-utils';
import { StudySearchService } from '../../../../core/services/study-search.service';
import { matchesStudySearch } from '../../../../shared/utils/study-search';
import { DomainSheet } from '../../../catalog-detail/models/domain-sheet.model';
import { DomainDataService } from '../../../catalog-detail/services/domain-data.service';
import { ConceptRow } from '../../domain-concepts/model/domain-concept-row.model';
import { BookAssociation, getAssociationTypeSuggestions } from '../model/book-association.model';
import { AssociationEntryCardComponent } from '../components/association-entry-card/association-entry-card.component';
import { AssociationFormComponent } from '../components/association-form/association-form.component';

@Component({
  selector: 'app-domain-association',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    AssociationEntryCardComponent,
    AssociationFormComponent,
  ],
  templateUrl: './domain-association.component.html',
  styleUrl: './domain-association.component.css',
})
export class DomainAssociationComponent {
  readonly rows = input.required<BookAssociation[]>();
  readonly currentSheet = input.required<DomainSheet>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly isAddingEntry = input(false);
  readonly closeEntry = output<void>();

  readonly editingId = signal<string | null>(null);
  readonly searchTerm = inject(StudySearchService).query;
  readonly newSourceConceptId = signal('');
  readonly newTargetConceptId = signal('');
  readonly newRelationType = signal('');
  readonly newDirected = signal(true);
  readonly newDescription = signal('');
  readonly newColor = signal('#735D78');
  readonly newPage = signal('');
  readonly newTags = signal<string[]>([]);
  readonly optionsLoadState = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');

  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;

  private readonly domainDataService = inject(DomainDataService);
  private readonly globalErrorService = inject(GlobalErrorService);
  private readonly transloco = inject(TranslocoService);
  private readonly taxonomyService = inject(TaxonomyService);
  private optionsLoadStarted = false;

  constructor() {
    effect(() => {
      const formOpen = this.isAddingEntry() || this.editingId() !== null;
      if (!formOpen) {
        if (this.optionsLoadState() === 'error') {
          this.optionsLoadStarted = false;
          this.optionsLoadState.set('idle');
        }
        return;
      }

      if (this.optionsLoadStarted) {
        return;
      }

      this.optionsLoadStarted = true;
      this.optionsLoadState.set('loading');
      untracked(() => void this.loadConceptOptions());
    });
  }

  readonly concepts = computed<ConceptRow[]>(() => {
    const conceptSheet = this.domainDataService
      .sheets()
      .find((sheet) => sheet.name.toUpperCase() === 'CONCEPTS');
    return (conceptSheet?.rows ?? []) as unknown as ConceptRow[];
  });

  readonly invalidTagsDetected = computed(() =>
    this.splitTags(this.newTags()).filter((tag) => !this.taxonomyService.isTagAllowed(tag)),
  );
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
    const query = this.normalizeSearch(this.searchTerm());
    if (!query) {
      return this.rows();
    }

    return this.rows().filter((relation) => matchesStudySearch(query,
      [
        this.bookName(), this.bookAuthor(), 'associations', 'asociaciones',
        this.conceptName(relation.sourceConceptId),
        this.conceptName(relation.targetConceptId),
        relation.relationType,
        relation.description,
        relation.book,
        relation.author,
        relation.page,
        ...relation.tags,
      ], relation.tags, { book: this.bookName() || relation.book, author: this.bookAuthor() || relation.author,
        contributor: relation.contributor }),
    );
  });

  splitTags(value: string[]): string[] {
    return parseTagsFromArray(value);
  }

  conceptName(id: string): string {
    return this.concepts().find((concept) => concept.id === id)?.term ?? id;
  }

  async deleteEntry(id: string): Promise<void> {
    if (!window.confirm(this.transloco.translate('COMMON.CONFIRM_DELETE'))) {
      return;
    }

    try {
      await this.domainDataService.deleteDomainRow(this.currentSheet().name, id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete concept relation.';
      this.globalErrorService.show(message);
    }
  }

  editEntry(relation: BookAssociation): void {
    this.editingId.set(relation.id);
    this.newSourceConceptId.set(relation.sourceConceptId);
    this.newTargetConceptId.set(relation.targetConceptId);
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

    const sourceConceptId = this.newSourceConceptId();
    const targetConceptId = this.newTargetConceptId();
    const relationType = this.newRelationType().trim();
    const directed = this.newDirected();
    const description = this.newDescription().trim();
    const color = this.newColor();
    const book = this.bookName().trim();
    const author = this.bookAuthor().trim();
    const page = this.newPage().trim();
    const tags = serializeTagsToArray(this.newTags());
    const editingId = this.editingId();
    const originalRow = editingId ? this.rows().find((row) => row.id === editingId) : undefined;

    if (editingId && !originalRow) {
      this.globalErrorService.show('The concept relation is no longer available.');
      return;
    }

    const newRow: BookAssociation = {
      ...(originalRow ?? {}),
      id: editingId ?? `associations_${Date.now()}`,
      row: originalRow?.row ?? this.rows().length + 1,
      sourceConceptId,
      targetConceptId,
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
      const message = error instanceof Error ? error.message : 'Failed to save concept relation.';
      this.globalErrorService.show(message);
    }
  }

  resetForm(): void {
    this.editingId.set(null);
    this.newSourceConceptId.set('');
    this.newTargetConceptId.set('');
    this.newRelationType.set('');
    this.newDirected.set(true);
    this.newDescription.set('');
    this.newColor.set('#735D78');
    this.newPage.set('');
    this.newTags.set([]);
    this.closeEntry.emit();
  }

  private normalizeSearch(value: string): string {
    return value.trim().toLocaleLowerCase();
  }

  private async loadConceptOptions(): Promise<void> {
    try {
      await this.domainDataService.loadAllRows('CONCEPTS');
      this.optionsLoadState.set('ready');
    } catch {
      this.optionsLoadState.set('error');
    }
  }
}
