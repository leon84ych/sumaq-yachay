import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { DomainDataService } from '../../catalog-detail/services/domain-data.service';
import { DomainSheet } from '../../catalog-detail/models/domain-sheet.model';
import { TagPickerComponent } from '../../../shared/tag-picker.component';
import { QuestionDifficulty, QuestionRow, QuestionType } from '../model/domain-question-row.model';

const QUESTION_TYPES: QuestionType[] = ['flashcard', 'multiple-choice', 'true-false', 'open'];
const QUESTION_DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];

@Component({
  selector: 'app-questions',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, TagPickerComponent],
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
  readonly newTags = signal('');
  readonly searchTerm = signal('');
  readonly isSaving = signal(false);
  readonly filteredRows = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    if (!query) {
      return this.rows();
    }

    return this.rows().filter((row) =>
      [row.question, row.answer, row.sourceDomain, row.sourceTerm ?? '', row.tags ?? ''].some(
        (value) => value.toLocaleLowerCase().includes(query),
      ),
    );
  });

  private readonly domainDataService = inject(DomainDataService);
  private readonly globalErrorService = inject(GlobalErrorService);

  splitTags(tags: string): string[] {
    return tags
      .split(/[\s,;]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  async addQuestion(): Promise<void> {
    const question = this.newQuestion().trim();
    const answer = this.newAnswer().trim();
    const sourceDomain = this.newSourceDomain().trim();
    if (!question || !answer || !sourceDomain || this.isSaving()) {
      return;
    }

    const tags = this.splitTags(this.newTags()).join(' ');
    const newRow: QuestionRow = {
      id: `question_${Date.now()}`,
      question,
      answer,
      type: this.newType(),
      sourceDomain,
      ...(this.newSourceTerm().trim() ? { sourceTerm: this.newSourceTerm().trim() } : {}),
      ...(this.newPage().trim() ? { page: this.newPage().trim() } : {}),
      ...(this.newDifficulty() ? { difficulty: this.newDifficulty() as QuestionDifficulty } : {}),
      ...(tags ? { tags } : {}),
      bookRow: this.currentSheet().row,
      bookName: this.bookName(),
      feed: 5,
      contributor: 'currentUser',
      aiGenerated: false,
      syncStatus: 'pending',
    };

    this.isSaving.set(true);
    try {
      const localRows = await this.domainDataService.getLocalDomainSheetRows('QUESTIONS');
      const existingRows = localRows.length > 0 ? localRows : this.rows();
      await this.domainDataService.updateDomainSheetRows('QUESTIONS', [...existingRows, newRow]);
      this.resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add question.';
      this.globalErrorService.show(message);
    } finally {
      this.isSaving.set(false);
    }
  }

  resetForm(): void {
    this.newQuestion.set('');
    this.newAnswer.set('');
    this.newType.set('open');
    this.newSourceDomain.set('MANUAL');
    this.newSourceTerm.set('');
    this.newPage.set('');
    this.newDifficulty.set('');
    this.newTags.set('');
    this.closeEntry.emit();
  }
}