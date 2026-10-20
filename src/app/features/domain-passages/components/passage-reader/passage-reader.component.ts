import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { PassagesRow } from '../../model/domain-passage-row.model';

@Component({
  selector: 'app-passage-reader',
  imports: [TranslocoPipe],
  templateUrl: './passage-reader.component.html',
  styleUrl: './passage-reader.component.css',
  host: {
    '(document:keydown.escape)': 'closeReader()',
  },
})
export class PassageReaderComponent {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly passage = input.required<PassagesRow>();
  readonly closeRequested = output<void>();
  readonly readingProgress = signal(0);
  readonly readerFontSize = signal(1.125);
  readonly readerFontFamily = signal<'serif' | 'sans'>('serif');
  readonly readerJustified = signal(false);
  readonly readerTheme = signal<'light' | 'dark'>('light');
  readonly copyStatus = signal<'idle' | 'copied' | 'error'>('idle');
  private bodyOverflowBeforeReader: string | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.restoreBodyScroll());
    this.readerTheme.set(
      this.document.documentElement.dataset['theme'] === 'dark' ? 'dark' : 'light',
    );

    const body = this.document.body;
    if (body) {
      this.bodyOverflowBeforeReader = body.style.overflow;
      body.style.overflow = 'hidden';
    }
  }

  estimateReadingMinutes(text: string): number {
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  }

  splitTags(tags: string | undefined): string[] {
    return (tags ?? '')
      .split(/[\s,;]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  adjustReaderFontSize(delta: number): void {
    this.readerFontSize.update((size) => Math.min(2, Math.max(1, size + delta)));
  }

  readerFontSizePercent(): number {
    return Math.round(this.readerFontSize() * 100);
  }

  setReaderFontFamily(event: Event): void {
    this.readerFontFamily.set(
      (event.target as HTMLSelectElement).value === 'sans' ? 'sans' : 'serif',
    );
  }

  toggleReaderJustification(): void {
    this.readerJustified.update((justified) => !justified);
  }

  toggleReaderTheme(): void {
    this.readerTheme.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
  }

  async copyPassageText(): Promise<void> {
    const text = this.passage().passageText;
    if (!text) {
      return;
    }

    try {
      const clipboard = this.document.defaultView?.navigator.clipboard;
      if (clipboard?.writeText) {
        await clipboard.writeText(text);
      } else if (!this.copyTextFallback(text)) {
        throw new Error('Clipboard access is unavailable.');
      }
      this.copyStatus.set('copied');
    } catch {
      this.copyStatus.set('error');
    }
  }

  closeReader(): void {
    this.closeRequested.emit();
    this.readingProgress.set(0);
    this.restoreBodyScroll();
  }

  updateReadingProgress(event: Event): void {
    const container = event.target as HTMLElement;
    const scrollableDistance = container.scrollHeight - container.clientHeight;
    const progress = scrollableDistance > 0 ? (container.scrollTop / scrollableDistance) * 100 : 0;
    this.readingProgress.set(Math.min(100, Math.max(0, progress)));
  }

  private copyTextFallback(text: string): boolean {
    const body = this.document.body;
    if (!body) {
      return false;
    }

    const textarea = this.document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    body.appendChild(textarea);
    textarea.select();
    const copied = this.document.execCommand('copy');
    textarea.remove();
    return copied;
  }

  private restoreBodyScroll(): void {
    if (this.bodyOverflowBeforeReader === null) {
      return;
    }

    if (this.document.body) {
      this.document.body.style.overflow = this.bodyOverflowBeforeReader;
    }
    this.bodyOverflowBeforeReader = null;
  }
}