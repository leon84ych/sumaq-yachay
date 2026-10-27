import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../../core/services/global-error.service';
import { DomainDataService } from '../../../catalog-detail/services/domain-data.service';
import { DomainSheet } from '../../../catalog-detail/models/domain-sheet.model';
import { QuestionDifficulty, QuestionRow, QuestionType } from '../model/domain-question-row.model';
import { TaxonomyService } from '../../../../core/services/taxonomy/taxonomy.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { parseTags, serializeTags } from '../../../../shared/utils/tag-utils';

const QUESTION_TYPES: QuestionType[] = ['flashcard', 'multiple-choice', 'true-false', 'open'];
const QUESTION_DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];

import { QuestionFormComponent } from '../components/question-form/question-form.component';

@Component({
  selector: 'app-questions',
  standalone: true,
  imports: [QuestionFormComponent, QuestionFormComponent, CommonModule, FormsModule, TranslocoPipe],
  templateUrl: './question.component.html',
  styleUrl: './question.component.css',
})
export class QuestionsComponent {
  readonly rows = input.required<QuestionRow[]>();
  readonly currentSheet = input.required<DomainSheet>();
  readonly bookName = input<string>('');
  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();

  readonly questionTypes = QUESTION_TYPES;
  readonly difficulties = QUESTION_DIFFICULTIES;
  readonly newQuestion = signal('');
  readonly newAnswer = signal('');
  readonly newType = signal<QuestionType>('open');
  readonly newSourceDomain = signal('MANUAL');
  readonly newSourceTerm = signal('');
  readonly newPage = signal('');
  readonly newDifficulty = signal<QuestionDifficulty | ''>('');
  readonly newTags = signal<string[]>([]);
  readonly searchTerm = signal('');
  readonly isSaving = signal(false);
  readonly editingId = signal<string | null>(null);

  private readonly domainDataService = inject(DomainDataService);
  private readonly globalErrorService = inject(GlobalErrorService);
  private readonly transloco = inject(TranslocoService);
  private readonly taxonomyService = inject(TaxonomyService);
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;

  /**
   * 1. REAL-TIME SIGNAL VALIDATION GUARD
   * Evaluates if any user-typed tags are missing from the master INDEX sheet whitelist matrix.
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
   * 2. FORM INHERENT VALIDATION CAP
   * Evaluates if core model prerequisites or tag system integrity rules are violated.
   */
  readonly isFormInvalid = computed<boolean>(() => {
    return (
      !this.newQuestion().trim() ||
      !this.newAnswer().trim() ||
      !this.newSourceDomain().trim() ||
      this.invalidTagsDetected().length > 0
    );
  });

  readonly filteredRows = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    if (!query) {
      return this.rows();
    }

    return this.rows().filter((row) =>
      [row.question, row.answer, row.sourceDomain, row.sourceTerm ?? '', ...(row.tags ?? [])].some(
        (value) => value.toLocaleLowerCase().includes(query),
      ),
    );
  });

  splitTags(tags: string[]): string[] {
    return parseTags(tags);
  }

  async deleteEntry(id: string): Promise<void> {
    if (!window.confirm(this.transloco.translate('COMMON.CONFIRM_DELETE'))) {
      return;
    }

    try {
      await this.domainDataService.deleteDomainRow(this.currentSheet().name, id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete question.';
      this.globalErrorService.show(message);
    }
  }

  editEntry(row: QuestionRow): void {
    this.editingId.set(row.id);
    this.newQuestion.set(row.question);
    this.newAnswer.set(row.answer);
    this.newType.set(row.type);
    this.newSourceDomain.set(row.sourceDomain);
    this.newSourceTerm.set(row.sourceTerm ?? '');
    this.newPage.set(row.page ?? '');
    this.newDifficulty.set(row.difficulty ?? '');
    this.newTags.set(row.tags ?? []);
  }

  async addQuestion(): Promise<void> {
    if (this.isFormInvalid() || this.isSaving()) {
      this.globalErrorService.show('Cannot add entry: Please remove unauthorized tags.');
      return;
    }

    const question = this.newQuestion().trim();
    const answer = this.newAnswer().trim();
    const sourceDomain = this.newSourceDomain().trim();
    const tags = serializeTags(this.newTags());
    const editingId = this.editingId();

    this.isSaving.set(true);
    try {
      const localRows = await this.domainDataService.getLocalDomainSheetRows('QUESTIONS');
      const existingRows = localRows.length > 0 ? localRows : this.rows();
      const originalRow = editingId
        ? existingRows.find((row) => row['id'] === editingId)
        : undefined;
      if (editingId && !originalRow) {
        throw new Error('The question being edited is no longer available.');
      }

      const newRow: QuestionRow = {
        ...(originalRow as QuestionRow | undefined),
        id: editingId ?? `question_${Date.now()}`,
        question,
        answer,
        type: this.newType(),
        sourceDomain,
        sourceTerm: this.newSourceTerm().trim() || undefined,
        page: this.newPage().trim() || undefined,
        difficulty: this.newDifficulty() || undefined,
        tags: tags || undefined,
        bookRow: this.currentSheet().row,
        bookName: this.bookName(),
        feed: (originalRow?.['feed'] as number | undefined) ?? 5,
        contributor: (originalRow?.['contributor'] as string | undefined) ?? 'currentUser',
        aiGenerated: (originalRow?.['aiGenerated'] as boolean | undefined) ?? false,
        syncStatus: 'pending',
      };
      const updatedRows = editingId
        ? existingRows.map((row) => (row['id'] === editingId ? newRow : row))
        : [...existingRows, newRow];

      await this.domainDataService.updateDomainSheetRows(
        'QUESTIONS',
        updatedRows,
        true,
        editingId ?? undefined,
        editingId ? undefined : newRow.id,
      );
      this.resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add question.';
      this.globalErrorService.show(message);
    } finally {
      this.isSaving.set(false);
    }
  }

  resetForm(): void {
    this.editingId.set(null);
    this.newQuestion.set('');
    this.newAnswer.set('');
    this.newType.set('open');
    this.newSourceDomain.set('MANUAL');
    this.newSourceTerm.set('');
    this.newPage.set('');
    this.newDifficulty.set('');
    this.newTags.set([]);
    this.closeEntry.emit();
  }
}
