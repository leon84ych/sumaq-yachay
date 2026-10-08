import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GlobalErrorService {
  readonly message = signal<string | null>(null);

  show(errorMessage: string): void {
    this.message.set(errorMessage.trim() || 'An unexpected error occurred.');
  }

  clear(): void {
    this.message.set(null);
  }
}
