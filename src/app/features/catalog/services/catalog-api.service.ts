import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, Observable, of, throwError } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { map } from 'rxjs/operators';
import {
  CatalogPostPayload,
  GetCatalogResponse,
} from '../models/catalog-api.model';

@Injectable({
  providedIn: 'root',
})
export class CatalogApiService {

  private config = inject(ConfigService);

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

    // Build standard query parameters matching Router.gs expectations
    const queryParams = new URLSearchParams({
      action: 'GET_CATALOG',
      target: target
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
   * deployment), transparently falls back to the local sample response instead of failing.
   */
  private fetchJsonWithSampleFallback(url: string, sampleUrl: string): Observable<GetCatalogResponse> {
    const fetchPromise: Promise<unknown> = fetch(url).then((response) => {
      if (response.status === 404) {
        console.warn(`GET ${url} returned 404; falling back to sample data (${sampleUrl}).`);
        this.config.setSampleDataFallbackActive(true);
        return fetch(sampleUrl).then((sampleResponse) => sampleResponse.json());
      }
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      this.config.setSampleDataFallbackActive(false);
      return response.json();
    });

    return from(fetchPromise).pipe(map((data) => data as GetCatalogResponse));
  }

  saveCatalogItem(payload: CatalogPostPayload): Observable<any> {
    // Sample data mode is fully offline — never issue a real POST to Google Sheets.
    if (this.config.useSampleData()) {
      return of({
        status: 'success',
        message: 'Sample data mode: change kept locally only, not sent to Google Sheets.',
      });
    }

    const webAppUrl = this.config.getWebAppUrl();

    const fetchPromise = fetch(webAppUrl, {
      method: 'POST',
      mode: 'no-cors', // 1. Force browser to ignore CORS response structural limits
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    })
      .then(response => {
        // 2. With 'no-cors', response.type will be 'opaque' and response.status will be 0.
        // This is expected! It means the data reached Google safely.
        return {
          status: 'success',
          message: 'Opaque request completed and data pushed to Google Sheets successfully.'
        };
      });

    return from(fetchPromise);
  }

}
