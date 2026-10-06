import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { DomainDataService } from '../features/catalog-detail/services/domain-data.service'; 

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const domainDataService = inject(DomainDataService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred.';

      if (error.error instanceof ErrorEvent) {
        // Client-side or network error
        errorMessage = `Client Error: ${error.error.message}`;
      } else {
        // Server-side response error
        errorMessage = error.error?.message || `Server Error Status: ${error.status}`;
      }

      // Automatically push the error message to your service's error signal so the UI updates
      domainDataService.errorMessage.set(errorMessage);

      console.error('HTTP Interceptor caught error:', errorMessage);

      return throwError(() => new Error(errorMessage));
    })
  );
};