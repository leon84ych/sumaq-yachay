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
import { DomainWriteView } from '../../shared/domain-repository/domain-write-view';
import { createDomainId } from '../../shared/model/domain-shared-model';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { StudySearchService } from '../../../../core/services/search/study-search.service';
import {
  normalizeTagsFromArray,
  parseTagsFromArray,
} from '../../../../shared/tag-picker/tag-picker.mapper';
import { matchesStudySearch } from '../../../../shared/utils/study-search';
import { GlossaryEntryCardComponent } from '../components/glossary-entry-card/glossary-entry-card.component';
import { GlossaryEntryFormComponent } from '../components/glossary-entry-form/glossary-entry-form.component';
import {
  GLOSSARY_DEFAULT_FEED,
  GLOSSARY_PARTS_OF_SPEECH,
  GlossaryPartOfSpeech,
  GlossaryRecord,
} from '../model/glossary-model';
import { GlossaryDataService } from '../services/glossary.service';

@Component({
  selector: 'app-domain-glossary',
  imports: [FormsModule, TranslocoPipe, GlossaryEntryFormComponent, GlossaryEntryCardComponent],
  templateUrl: './glossary.component.html',
  styleUrl: './glossary.component.css',
})
export class GlossaryComponent implements OnInit {
  readonly bookId = input.required<string>();
  readonly isAddingEntry = input(false);
  readonly closeEntry = output<void>();

  readonly rows = signal<GlossaryRecord[]>([]);
  readonly sync = new DomainWriteView<GlossaryRecord>('GLOSARY', this.bookId, this.rows);
  readonly bookName = signal('');
  readonly bookAuthor = signal('');
  readonly bookRow = signal<number | null>(null);
  private readonly allowedTags = signal<ReadonlySet<string>>(new Set());

  readonly partsOfSpeech = GLOSSARY_PARTS_OF_SPEECH;
  readonly newTerm = signal('');
  readonly newLanguage = signal('');
  readonly newDefinition = signal('');
  readonly newPartOfSpeech = signal<GlossaryPartOfSpeech | ''>('');
  readonly newEtymology = signal('');
  readonly newSynonyms = signal('');
  readonly newContextSentence = signal('');
  readonly newSource = signal('');
  readonly newPage = signal('');
  readonly newTags = signal<string[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly isSaving = signal(false);
  readonly searchTerm = inject(StudySearchService).query;
  readonly definitionMaxLength = 400;
  readonly definitionCharactersRemaining = computed(
    () => this.definitionMaxLength - this.newDefinition().length,
  );

  readonly source = computed(() => this.newSource().trim() || this.bookName().trim());
  private readonly glossaryDataService = inject(GlossaryDataService);
  private readonly globalMessageService = inject(GlobalMessageService);
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
    () =>
      !this.newTerm().trim() ||
      !this.newLanguage().trim() ||
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
            'glossary',
            'glosary',
            'glosario',
            row.term,
            row.language ?? '',
            row.definition,
            row.partOfSpeech ?? '',
            row.etymology ?? '',
            row.synonyms ?? '',
            row.contextSentence ?? '',
            row.source ?? '',
            row.page ?? '',
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
      const book = await this.glossaryDataService.getBookRecord(this.bookId());
      this.bookName.set(book?.name ?? '');
      this.bookAuthor.set(book?.author ?? '');
      this.bookRow.set(book?.row ?? null);
      this.newLanguage.set(book?.language ?? '');
      await this.refreshAllowedTags();
      this.sync.observe();
      this.sync.initialize(await this.glossaryDataService.getRecords(this.bookId()));
    } catch (error) {
      this.showError(error, 'Failed to load glossary entries.');
    }
  }

  async refreshAllowedTags(): Promise<void> {
    try {
      const tags = await this.glossaryDataService.getAllowedTags(this.bookId());
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
      await this.sync.delete(record);
    } catch (error) {
      this.showError(error, 'Failed to delete glossary entry.');
    }
  }

  editEntry(record: GlossaryRecord): void {
    if (!this.sync.startEdit(record)) return;
    this.submitted.set(false);
    this.editingId.set(record.id);
    this.newTerm.set(record.term);
    this.newLanguage.set(record.language || this.newLanguage());
    this.newDefinition.set(record.definition);
    this.newPartOfSpeech.set(record.partOfSpeech ?? '');
    this.newEtymology.set(record.etymology ?? '');
    this.newSynonyms.set(record.synonyms ?? '');
    this.newContextSentence.set(record.contextSentence ?? '');
    this.newSource.set(record.source ?? '');
    this.newPage.set(record.page ?? '');
    this.newTags.set(record.tags);
    void this.refreshAllowedTags();
  }

  resetForm(): void {
    this.sync.clearEdit();
    this.submitted.set(false);
    this.editingId.set(null);
    this.newTerm.set('');
    this.newLanguage.set('');
    this.newDefinition.set('');
    this.newPartOfSpeech.set('');
    this.newEtymology.set('');
    this.newSynonyms.set('');
    this.newContextSentence.set('');
    this.newSource.set('');
    this.newPage.set('');
    this.newTags.set([]);
    this.closeEntry.emit();
  }

  async saveEntry(): Promise<void> {
    if (this.isSaving()) {
      return;
    }
    this.submitted.set(true);
    if (this.isFormInvalid()) {
      return;
    }

    const editingId = this.editingId();
    const original = this.sync.original(editingId);
    if (editingId && !original) {
      this.globalMessageService.showError(
        'The glossary entry being edited is no longer available.',
      );
      return;
    }

    const bookRow = this.bookRow() ?? original?.bookRow;
    if (!bookRow) {
      this.globalMessageService.showError('Book record is missing row.');
      return;
    }

    const record: GlossaryRecord = {
      id: editingId ?? createDomainId(this.bookId(), 'GLOSARY'),
      bookId: this.bookId(),
      bookRow,
      itemRow: original?.itemRow ?? 0,
      term: this.newTerm().trim(),
      language: this.newLanguage().trim(),
      definition: this.newDefinition().trim().slice(0, this.definitionMaxLength),
      partOfSpeech: this.newPartOfSpeech() || undefined,
      etymology: this.newEtymology().trim() || undefined,
      synonyms: this.newSynonyms().trim() || undefined,
      contextSentence: this.newContextSentence().trim() || undefined,
      source: this.source() || undefined,
      page: this.newPage().trim() || undefined,
      tags: normalizeTagsFromArray(this.newTags()),
      feed: original?.feed ?? GLOSSARY_DEFAULT_FEED,
      contributor: original?.contributor ?? '',
      syncStatus: 'pending',
    };

    this.isSaving.set(true);
    try {
      await this.sync.save(record, editingId);
      this.resetForm();
      try {
        await this.glossaryDataService.rememberLanguage(record.language);
      } catch (error) {
        this.showError(error, 'Failed to remember the language.');
      }
    } catch (error) {
      this.showError(error, 'Failed to save glossary entry.');
    } finally {
      this.isSaving.set(false);
    }
  }

  private showError(error: unknown, fallback: string): void {
    this.globalMessageService.showError(error instanceof Error ? error.message : fallback);
  }
}
