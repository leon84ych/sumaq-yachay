import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { GlobalMessageService } from '../core/services/global-message.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const globalMessageService = inject(GlobalMessageService);

  return next(req).pipe(
    catchError((error: unknown) => {
      const httpError =
        error instanceof HttpErrorResponse ? error : new HttpErrorResponse({ error });
      const errorMessage = getErrorMessage(httpError);

      globalMessageService.showError(errorMessage);
      console.error('HTTP interceptor caught error:', errorMessage);

      return throwError(() => new Error(errorMessage));
    })
  );
};

function getErrorMessage(error: HttpErrorResponse): string {
  if (error.error instanceof ErrorEvent) {
    return `Client error: ${error.error.message}`;
  }

  if (typeof error.error === 'string' && error.error.trim()) {
    return `Request failed (${error.status}): ${error.error.trim()}`;
  }

  if (error.error && typeof error.error.message === 'string' && error.error.message.trim()) {
    return `Request failed (${error.status}): ${error.error.message.trim()}`;
  }

  return `Request failed with status ${error.status || 'unknown'}.`;
}