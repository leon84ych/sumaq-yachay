import { ErrorHandler, inject } from '@angular/core';
import { GlobalErrorService } from '../services/global-error.service';

export class GlobalErrorHandler extends ErrorHandler {
  private readonly globalErrorService = inject(GlobalErrorService);

  override handleError(error: unknown): void {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : 'An unexpected error occurred.';

    this.globalErrorService.show(message);
    super.handleError(error);
  }
}
