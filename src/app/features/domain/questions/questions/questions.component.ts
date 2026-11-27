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
import { QuestionEntryCardComponent } from '../components/question-entry-card/question-entry-card.component';
import { QuestionEntryFormComponent } from '../components/question-entry-form/question-entry-form.component';
import {
  QUESTION_DEFAULT_FEED,
  QUESTION_DIFFICULTIES,
  QUESTION_TYPES,
  QuestionDifficulty,
  QuestionOption,
  QuestionRecord,
  QuestionType,
} from '../model/questions-model';
import { QuestionDataService } from '../services/questions.service';

@Component({
  selector: 'app-domain-questions',
  imports: [FormsModule, TranslocoPipe, QuestionEntryFormComponent, QuestionEntryCardComponent],
  templateUrl: './questions.component.html',
  styleUrl: './questions.component.css',
})
export class QuestionsComponent implements OnInit {
  readonly bookId = input.required<string>();
  readonly isAddingEntry = input(false);
  readonly closeEntry = output<void>();

  readonly rows = signal<QuestionRecord[]>([]);
  readonly sync = new DomainWriteView<QuestionRecord>('QUESTIONS', this.bookId, this.rows);
  readonly bookName = signal('');
  readonly bookAuthor = signal('');
  readonly bookRow = signal<number | null>(null);
  private readonly allowedTags = signal<ReadonlySet<string>>(new Set());

  readonly questionTypes = QUESTION_TYPES;
  readonly difficulties = QUESTION_DIFFICULTIES;
  readonly newQuestion = signal('');
  readonly newAnswer = signal('');
  readonly newType = signal<QuestionType>('open');
  readonly optionDrafts = signal<string[]>(['', '']);
  readonly correctOptionIndex = signal(0);
  readonly newSourceDomain = signal('MANUAL');
  readonly newSourceTerm = signal('');
  readonly newPage = signal('');
  readonly newDifficulty = signal<QuestionDifficulty | ''>('');
  readonly newTags = signal<string[]>([]);
  readonly isSaving = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly searchTerm = inject(StudySearchService).query;

  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;
  private readonly questionDataService = inject(QuestionDataService);
  private readonly globalMessageService = inject(GlobalMessageService);
  private readonly transloco = inject(TranslocoService);

  readonly invalidTagsDetected = computed(() => {
    const allowed = this.allowedTags();
    return parseTagsFromArray(this.newTags()).filter(
      (tag) => !allowed.has(normalizeTagsFromArray([tag])[0]),
    );
  });

  readonly isQuestionInvalid = computed(() => !this.newQuestion().trim());
  readonly isAnswerInvalid = computed(() => !this.newAnswer().trim());
  readonly isTypeInvalid = computed(() => !this.newType());
  readonly isSourceDomainInvalid = computed(() => !this.newSourceDomain().trim());
  readonly multipleChoiceOptionsInvalid = computed(() => {
    const options = this.optionDrafts();
    return (
      this.newType() === 'multiple-choice' &&
      (options.filter((option) => option.trim()).length < 2 ||
        !options[this.correctOptionIndex()]?.trim())
    );
  });

  readonly isFormInvalid = computed(() => {
    const options = this.optionDrafts();
    return (
      this.isQuestionInvalid() ||
      this.isAnswerInvalid() ||
      this.isSourceDomainInvalid() ||
      this.isTypeInvalid() ||
      this.multipleChoiceOptionsInvalid() ||
      this.invalidTagsDetected().length > 0
    );
  });

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
            row.bookName ?? '',
            row.question,
            row.answer,
            row.sourceDomain,
            row.sourceTerm ?? '',
            row.type,
            row.difficulty ?? '',
            'questions',
            'preguntas',
            row.contributor,
            ...row.tags,
          ],
          row.tags,
          { book: bookName || row.bookName, author: bookAuthor, contributor: row.contributor },
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
      const book = await this.questionDataService.getBookRecord(this.bookId());
      this.bookName.set(book?.name ?? '');
      this.bookAuthor.set(book?.author ?? '');
      this.bookRow.set(book?.row ?? null);
      await this.refreshAllowedTags();
      this.sync.observe();
      this.sync.initialize(await this.questionDataService.getRecords(this.bookId()));
    } catch (error) {
      this.showError(error, 'Failed to load questions.');
    }
  }

  async refreshAllowedTags(): Promise<void> {
    try {
      const tags = await this.questionDataService.getAllowedTags(this.bookId());
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
      this.showError(error, 'Failed to delete question.');
    }
  }

  setOptionText(index: number, text: string): void {
    this.optionDrafts.update((options) =>
      options.map((option, optionIndex) => (optionIndex === index ? text : option)),
    );
  }

  addOption(): void {
    this.optionDrafts.update((options) => [...options, '']);
  }

  removeOption(index: number): void {
    const options = this.optionDrafts();
    if (options.length <= 2) {
      return;
    }
    this.optionDrafts.set(options.filter((_, optionIndex) => optionIndex !== index));
    const correctIndex = this.correctOptionIndex();
    this.correctOptionIndex.set(
      correctIndex === index ? 0 : correctIndex > index ? correctIndex - 1 : correctIndex,
    );
  }

  editEntry(record: QuestionRecord): void {
    if (!this.sync.startEdit(record)) return;
    this.submitted.set(false);
    this.editingId.set(record.id);
    this.newQuestion.set(record.question);
    this.newAnswer.set(record.answer);
    this.newType.set(record.type);
    this.optionDrafts.set(
      record.options.length >= 2 ? record.options.map((option) => option.text) : ['', ''],
    );
    this.correctOptionIndex.set(
      Math.max(
        0,
        record.options.findIndex((option) => option.isCorrect),
      ),
    );
    this.newSourceDomain.set(record.sourceDomain);
    this.newSourceTerm.set(record.sourceTerm ?? '');
    this.newPage.set(record.page ?? '');
    this.newDifficulty.set(record.difficulty ?? '');
    this.newTags.set(record.tags);
    void this.refreshAllowedTags();
  }

  async saveQuestion(): Promise<void> {
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
      this.globalMessageService.showError('The question being edited is no longer available.');
      return;
    }
    const bookRow = this.bookRow() ?? original?.bookRow;
    if (!bookRow) {
      this.globalMessageService.showError('Book record is missing row.');
      return;
    }

    const options: QuestionOption[] =
      this.newType() === 'multiple-choice'
        ? this.optionDrafts()
            .map((text, index) => ({
              id: original?.options[index]?.id ?? `option_${Date.now()}_${index + 1}`,
              text: text.trim(),
              isCorrect: index === this.correctOptionIndex(),
            }))
            .filter((option) => option.text)
        : [];

    const record: QuestionRecord = {
      id: editingId ?? createDomainId(this.bookId(), 'QUESTIONS'),
      bookId: this.bookId(),
      bookRow,
      itemRow: original?.itemRow ?? 0,
      question: this.newQuestion().trim(),
      answer: this.newAnswer().trim(),
      type: this.newType(),
      options,
      sourceDomain: this.newSourceDomain().trim(),
      sourceRowId: original?.sourceRowId,
      sourceTerm: this.newSourceTerm().trim() || undefined,
      bookName: this.bookName(),
      page: this.newPage().trim() || undefined,
      difficulty: this.newDifficulty() || undefined,
      aiGenerated: original?.aiGenerated ?? false,
      tags: normalizeTagsFromArray(this.newTags()),
      feed: original?.feed ?? QUESTION_DEFAULT_FEED,
      contributor: original?.contributor ?? '',
      syncStatus: 'pending',
    };

    this.isSaving.set(true);
    try {
      await this.sync.save(record, editingId);
      this.resetForm();
    } catch (error) {
      this.showError(error, 'Failed to save question.');
    } finally {
      this.isSaving.set(false);
    }
  }

  resetForm(): void {
    this.sync.clearEdit();
    this.submitted.set(false);
    this.editingId.set(null);
    this.newQuestion.set('');
    this.newAnswer.set('');
    this.newType.set('open');
    this.optionDrafts.set(['', '']);
    this.correctOptionIndex.set(0);
    this.newSourceDomain.set('MANUAL');
    this.newSourceTerm.set('');
    this.newPage.set('');
    this.newDifficulty.set('');
    this.newTags.set([]);
    this.closeEntry.emit();
  }

  private showError(error: unknown, fallback: string): void {
    this.globalMessageService.showError(error instanceof Error ? error.message : fallback);
  }
}
