import { ErrorHandler, inject } from '@angular/core';
import { GlobalMessageService } from '../services/global-message.service';

export class GlobalErrorHandler extends ErrorHandler {
  private readonly globalMessageService = inject(GlobalMessageService);

  override handleError(error: unknown): void {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : 'An unexpected error occurred.';

    this.globalMessageService.showError(message);
    super.handleError(error);
  }
}
