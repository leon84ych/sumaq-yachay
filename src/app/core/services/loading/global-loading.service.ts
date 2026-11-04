import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GlobalLoadingService {
  readonly isLoading = signal(false);

  private readonly activeOperations = new Set<object>();

  begin(): object {
    const operation = {};
    this.activeOperations.add(operation);
    this.isLoading.set(true);
    return operation;
  }

  end(operation: object): void {
    if (!this.activeOperations.delete(operation)) {
      return;
    }

    this.isLoading.set(this.activeOperations.size > 0);
  }
}
