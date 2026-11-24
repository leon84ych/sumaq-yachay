import { Component, inject, input, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { BrowserAiService } from '../../../../../core/services/ia/BrowserIA.service';
import { GlobalErrorService } from '../../../../../core/services/error/global-error.service';
import { DomainDataService } from '../../../../book-detail/services/domain-data.service';
import { QuestionRow, QuestionType } from '../../model/domain-question-row.model';
import { PermissionService } from '../../../../../core/services/permission/permission.service';
import { normalizeTagsFromArray } from '../../../../../shared/tag-picker/tag-picker.mapper';
import { QuestionDataService } from '../../../../domain-1/questions/services/questions.service';
import { QuestionRecord as V2QuestionRecord } from '../../../../domain-1/questions/model/questions-model';

const QUESTION_TYPES: QuestionType[] = ['flashcard', 'multiple-choice', 'true-false', 'open'];

@Component({
  selector: 'app-question-generator',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './question-generator.component.html',
  styleUrl: './question-generator.component.css',
})
export class QuestionGeneratorComponent {
  readonly sourceTerm = input.required<string>();
  readonly sourceText = input.required<string>();
  readonly sourceDomain = input.required<string>();
  readonly sourceRowId = input.required<string>();
  readonly bookRow = input.required<number>();
  readonly bookId = input('');
  readonly bookName = input('');
  readonly page = input('');
  readonly tags = input<string[]>([]);

  readonly questionTypes = QUESTION_TYPES;
  readonly isOpen = signal(false);
  readonly selectedType = signal<QuestionType>('open');
  readonly isGenerating = signal(false);

  private readonly browserAi = inject(BrowserAiService);
  private readonly transloco = inject(TranslocoService);
  private readonly domainDataService = inject(DomainDataService);
  private readonly questionDataService = inject(QuestionDataService);
  private readonly globalErrorService = inject(GlobalErrorService);
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;

  toggleOpen(): void {
    this.isOpen.update((open) => !open);
  }

  setQuestionType(value: string): void {
    if (QUESTION_TYPES.includes(value as QuestionType)) {
      this.selectedType.set(value as QuestionType);
    }
  }

  async generateAndSave(): Promise<void> {
    if (this.isGenerating()) {
      return;
    }
    if (!this.browserAi.isAiAvailable()) {
      this.globalErrorService.show(this.transloco.translate('DOMAINS.QUESTIONS.AI_UNAVAILABLE'));
      return;
    }

    this.isGenerating.set(true);
    try {
      const question = await this.browserAi.generateQuestionFromEntry(
        this.sourceTerm(),
        this.sourceText(),
        this.selectedType(),
      );
      if (!question) {
        throw new Error('La IA no generó una pregunta. Inténtalo de nuevo.');
      }

      const newQuestionId = `question_${Date.now()}`;
      if (this.bookId()) {
        const newQuestion: V2QuestionRecord = {
          id: newQuestionId,
          bookId: this.bookId(),
          bookRow: this.bookRow(),
          itemRow: 0,
          question: question.slice(0, 500),
          answer: this.sourceText().slice(0, 500),
          type: this.selectedType(),
          options: [],
          sourceDomain: this.sourceDomain(),
          sourceRowId: this.sourceRowId(),
          sourceTerm: this.sourceTerm(),
          bookName: this.bookName(),
          page: this.page() || undefined,
          aiGenerated: true,
          tags: normalizeTagsFromArray(this.tags()),
          feed: 5,
          contributor: 'browser-ai',
          syncStatus: 'pending',
        };
        await this.questionDataService.addDomainItem(newQuestion);
      } else {
        const questionsSheet = this.domainDataService
          .sheets()
          .find((sheet) => sheet.name.toUpperCase() === 'QUESTIONS');
        const localRows = await this.domainDataService.getLocalDomainSheetRows('QUESTIONS');
        const existingRows = localRows.length > 0 ? localRows : (questionsSheet?.rows ?? []);
        const newQuestion: QuestionRow = {
          id: newQuestionId,
          question: question.slice(0, 500),
          answer: this.sourceText().slice(0, 500),
          type: this.selectedType(),
          sourceDomain: this.sourceDomain(),
          sourceRowId: this.sourceRowId(),
          sourceTerm: this.sourceTerm(),
          bookRow: this.bookRow(),
          bookName: this.bookName(),
          ...(this.page() ? { page: this.page() } : {}),
          tags: normalizeTagsFromArray(this.tags()),
          feed: 5,
          contributor: 'browser-ai',
          aiGenerated: true,
          syncStatus: 'pending',
        };

        await this.domainDataService.updateDomainSheetRows(
          'QUESTIONS',
          [...existingRows, newQuestion],
          true,
          undefined,
          newQuestion.id,
        );
      }
      this.isOpen.set(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate question.';
      this.globalErrorService.show(message);
    } finally {
      this.isGenerating.set(false);
    }
  }
}
