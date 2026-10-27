import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { QuestionAttemptService } from '../services/question-attempt.service';
import {
  QuestionPracticeFilters,
  QuestionPracticeItem,
  QuestionPracticeService,
} from '../services/question-practice.service';
import { QuestionOption } from '../model/domain-question-row.model';

@Component({
  selector: 'app-question-practice',
  standalone: true,
  imports: [CommonModule, TranslocoPipe],
  templateUrl: './question-practice.component.html',
  styleUrl: './question-practice.component.css',
})
export class QuestionPracticeComponent {
  private readonly practiceService = inject(QuestionPracticeService);
  private readonly attemptService = inject(QuestionAttemptService);
  private readonly destroyRef = inject(DestroyRef);

  readonly questions = signal<QuestionPracticeItem[]>([]);
  readonly searchQuery = signal('');
  readonly currentIndex = signal(0);
  readonly selectedOptionId = signal('');
  readonly freeResponse = signal('');
  readonly answerRevealed = signal(false);
  readonly isSubmitted = signal(false);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly answerCorrect = signal<boolean | null>(null);
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly currentQuestion = computed(() => this.questions()[this.currentIndex()] ?? null);
  readonly currentOptions = computed(() => {
    const question = this.currentQuestion();
    return question ? this.practiceService.optionsFor(question) : [];
  });
  readonly progressLabel = computed(() =>
    this.questions().length === 0
      ? ''
      : `${this.currentIndex() + 1}/${this.questions().length}`,
  );

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    });
    void this.refreshSample();
  }

  onSearchInput(query: string): void {
    this.searchQuery.set(query);
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.searchDebounceTimer = null;
      void this.refreshSample();
    }, 250);
  }

  async refreshSample(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const filters: QuestionPracticeFilters = {
        query: this.searchQuery().trim(),
      };
      this.questions.set(await this.practiceService.loadRandomBatch(filters));
      this.currentIndex.set(0);
      this.resetAnswerState();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'DOMAINS.QUESTIONS.PRACTICE.ERROR');
    } finally {
      this.isLoading.set(false);
    }
  }

  selectOption(option: QuestionOption): void {
    if (!this.answerRevealed()) this.selectedOptionId.set(option.id);
  }

  revealFlashcardAnswer(): void {
    this.answerRevealed.set(true);
  }

  async assessFlashcard(isCorrect: boolean): Promise<void> {
    const response = isCorrect ? 'self-assessed: correct' : 'self-assessed: review';
    await this.saveAttempt(response, isCorrect);
  }

  async submitChoice(): Promise<void> {
    const option = this.currentOptions().find((candidate) => candidate.id === this.selectedOptionId());
    if (!option) return;
    await this.saveAttempt(option.text, option.isCorrect);
  }

  async submitOpenResponse(): Promise<void> {
    const response = this.freeResponse().trim();
    if (!response) return;
    await this.saveAttempt(response, null);
  }

  async advance(): Promise<void> {
    if (this.currentIndex() + 1 < this.questions().length) {
      this.currentIndex.update((index) => index + 1);
      this.resetAnswerState();
      return;
    }
    await this.refreshSample();
  }

  private async saveAttempt(userResponse: string, isCorrect: boolean | null): Promise<void> {
    const question = this.currentQuestion();
    if (!question || this.isSaving() || this.isSubmitted()) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);
    try {
      await this.attemptService.record({
        questionId: question.id,
        bookRow: question.row,
        timestamp: new Date().toISOString(),
        userResponse,
        isCorrect,
        type: question.type,
      });
      this.answerCorrect.set(isCorrect);
      this.answerRevealed.set(true);
      this.isSubmitted.set(true);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'DOMAINS.QUESTIONS.PRACTICE.SAVE_ERROR');
    } finally {
      this.isSaving.set(false);
    }
  }

  private resetAnswerState(): void {
    this.selectedOptionId.set('');
    this.freeResponse.set('');
    this.answerRevealed.set(false);
    this.isSubmitted.set(false);
    this.answerCorrect.set(null);
  }
}