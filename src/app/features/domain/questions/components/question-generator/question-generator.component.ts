import { Component, inject, input, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { BrowserAiService } from '../../../../../core/services/ia/BrowserIA.service';
import { GlobalMessageService } from '../../../../../core/services/global-message.service';
import { PermissionService } from '../../../../../core/services/permission/permission.service';
import { normalizeTagsFromArray } from '../../../../../shared/tag-picker/tag-picker.mapper';
import { QuestionDataService } from '../../../../domain/questions/services/questions.service';
import { QuestionRecord, QuestionType } from '../../../../domain/questions/model/questions-model';

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
  private readonly questionDataService = inject(QuestionDataService);
  private readonly globalMessageService = inject(GlobalMessageService);
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
    if (!this.bookId()) {
      this.globalMessageService.showError('No active book is available for this question.');
      return;
    }
    if (!this.browserAi.isAiAvailable()) {
      this.globalMessageService.showError(this.transloco.translate('DOMAINS.QUESTIONS.AI_UNAVAILABLE'));
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
      const newQuestion: QuestionRecord = {
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
      this.isOpen.set(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate question.';
      this.globalMessageService.showError(message);
    } finally {
      this.isGenerating.set(false);
    }
  }
}
