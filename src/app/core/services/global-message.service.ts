import { Injectable, signal } from '@angular/core';

export type GlobalMessageType = 'error' | 'success' | 'info';

export interface GlobalMessage {
  type: GlobalMessageType;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class GlobalMessageService {
  readonly message = signal<GlobalMessage | null>(null);

  showError(text: string): void {
    this.show('error', text);
  }

  showSuccess(text: string): void {
    this.show('success', text);
  }

  showInfo(text: string): void {
    this.show('info', text || '');
  }

  clear(): void {
    this.message.set(null);
  }

  private show(type: GlobalMessageType, text: string): void {
    const normalizedText = text.trim();
    const fallbackText =
      type === 'error'
        ? 'An unexpected error occurred.'
        : type === 'success'
          ? 'Operation completed successfully.'
          : '';
    this.message.set({ type, text: normalizedText || fallbackText });
  }
}