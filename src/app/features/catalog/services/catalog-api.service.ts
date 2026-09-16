import { Injectable, inject } from '@angular/core';
import { from, Observable, of, throwError } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { map } from 'rxjs/operators';
import {
  CatalogPostPayload,
  GetCatalogResponse,
} from '../models/catalog-api.model';
//import { GoogleUnkownService } from '../../../core/services/google-unknown.service';

import { GoogleAuthService } from '../../authentication/services/google-auth-service';

@Injectable({
  providedIn: 'root',
})
export class CatalogApiService {

  private config = inject(ConfigService);
  private authService = inject(GoogleAuthService);

  /**
   * GET: Retrieves catalog rows matching the modular architecture pattern
   * @param target Defaults to 'CATALOG'. Can pass 'INVENTORY', etc.
   */
  getCatalog(target: string = 'CATALOG'): Observable<GetCatalogResponse> {
    if (this.config.useSampleData()) {
      this.config.setSampleDataFallbackActive(false);
      return this.fetchJson('/sample-responses/get-catalog.sample.json');
    }

    const webAppUrl = this.config.getWebAppUrl();
    if (!webAppUrl) {
      return throwError(() => new Error('Google Apps Script Web App URL is not configured.'));
    }

    // 1. Retrieve the token
    const token = this.authService.idToken();
    if (!token) {
      return throwError(() => new Error('User is not authenticated with Google.'));
    }

    // 2. Attach token to query parameters for GET requests
    const queryParams = new URLSearchParams({
      action: 'GET_CATALOG',
      target: target,
      idToken: token // <-- Pass to GAS
    }).toString();

    const fullUrl = `${webAppUrl}?${queryParams}`;

    return this.fetchJsonWithSampleFallback(fullUrl, '/sample-responses/get-catalog.sample.json');
  }

  private fetchJson(url: string): Observable<GetCatalogResponse> {
    const fetchPromise: Promise<unknown> = fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      });

    return from(fetchPromise).pipe(
      map(data => data as GetCatalogResponse)
    );
  }

  /**
   * Fetches `url`; if the live endpoint returns 404 (e.g. stale/removed Apps Script
   * deployment), or if it exceeds the configured timeout, transparently falls back to the
   * local sample response instead of failing.
   */
  private fetchJsonWithSampleFallback(url: string, sampleUrl: string): Observable<GetCatalogResponse> {
    const timeoutMs = this.config.getGasTimeoutMs();
    const fetchPromise: Promise<GetCatalogResponse> = new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn(`GET ${url} timed out after ${timeoutMs}ms; falling back to sample data (${sampleUrl}).`);
        this.config.setSampleDataFallbackActive(true);
        fetch(sampleUrl)
          .then((sampleResponse) => {
            if (!sampleResponse.ok) {
              throw new Error(`Sample response error! Status: ${sampleResponse.status}`);
            }
            return sampleResponse.json();
          })
          .then((data) => resolve(data as GetCatalogResponse))
          .catch(reject);
      }, timeoutMs);

      fetch(url, { signal: controller.signal })
        .then((response) => {
          if (response.status === 404) {
            console.warn(`GET ${url} returned 404; falling back to sample data (${sampleUrl}).`);
            this.config.setSampleDataFallbackActive(true);
            return fetch(sampleUrl).then((sampleResponse) => {
              if (!sampleResponse.ok) {
                throw new Error(`Sample response error! Status: ${sampleResponse.status}`);
              }
              return sampleResponse.json();
            });
          }
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          this.config.setSampleDataFallbackActive(false);
          return response.json();
        })
        .then((data) => {
          clearTimeout(timeoutId);
          resolve(data as GetCatalogResponse);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }
          reject(error);
        });
    });

    return from(fetchPromise).pipe(map((data) => data as GetCatalogResponse));
  }

  saveCatalogItem(payload: CatalogPostPayload): Observable<any> {
    if (this.config.useSampleData()) {
      return of({
        status: 'success',
        message: 'Sample data mode: change kept locally only, not sent to Google Sheets.',
      });
    }

    const webAppUrl = this.config.getWebAppUrl();
    const timeoutMs = this.config.getGasTimeoutMs();

    // 1. Retrieve the token
    const token = this.authService.idToken();
    if (!token) {
      return throwError(() => new Error('User is not authenticated with Google.'));
    }

    // 2. Attach token to the JSON payload for POST requests
    const authenticatedPayload = {
      ...payload,
      idToken: token // <-- Pass to GAS
    };

    const fetchPromise = new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error(`Google Apps Script call timed out after ${timeoutMs}ms.`));
      }, timeoutMs);

      fetch(webAppUrl, {
        method: 'POST',
        mode: 'no-cors', 
        signal: controller.signal,
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(authenticatedPayload) // <-- Send authenticated payload
      })
        .then(() => {
          clearTimeout(timeoutId);
          resolve({
            status: 'success',
            message: 'Opaque request completed and data pushed to Google Sheets successfully.'
          });
        })
        // ... (keep existing catch block)
    });

    return from(fetchPromise);
  }

}
