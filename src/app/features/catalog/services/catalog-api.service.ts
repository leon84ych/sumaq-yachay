import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, Observable, throwError } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { map } from 'rxjs/operators';
import {
  CatalogPostPayload,
  CatalogPostResponse,
  GetCatalogResponse,
} from '../models/catalog-api.model';

@Injectable({
  providedIn: 'root',
})
export class CatalogApiService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  /**
   * HTTP GET: Fetches catalog entries from the Master Index Sheet via Google Apps Script
   */
  getCatalog(): Observable<GetCatalogResponse> {
    const webAppUrl = this.config.getWebAppUrl();
    if (!webAppUrl) {
      return throwError(() => new Error('Google Apps Script Web App URL is not configured.'));
    }

    const fetchPromise: Promise<unknown> = fetch(webAppUrl)
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
   * HTTP POST: Creates or updates an entry in the Master Index Sheet
   * Uses text/plain to prevent CORS preflight OPTIONS request on Apps Script.
   */
  saveCatalogItem(payload: CatalogPostPayload): Observable<CatalogPostResponse> {
    const webAppUrl = this.config.getWebAppUrl();
    if (!webAppUrl) {
      return throwError(() => new Error('Google Apps Script Web App URL is not configured.'));
    }
    return this.http.post<CatalogPostResponse>(
      webAppUrl,
      JSON.stringify(payload),
      {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      }
    );
  }
}
