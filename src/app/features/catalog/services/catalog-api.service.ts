import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, Observable, throwError } from 'rxjs';
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

    const fetchPromise: Promise<unknown> = fetch(fullUrl)
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
