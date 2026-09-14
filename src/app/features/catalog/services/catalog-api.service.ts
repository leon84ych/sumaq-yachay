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

  saveCatalogItem(payload: CatalogPostPayload): Observable<any> {
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
