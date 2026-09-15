import { Injectable, inject } from '@angular/core';
import { from, Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigService } from '../../../core/services/config.service';
import { GetDomainSheetsResponse } from '../models/domain-sheet.model';

@Injectable({
  providedIn: 'root',
})
export class DomainDataApiService {
  private config = inject(ConfigService);

  /**
   * HTTP GET: Fetches every Domain Data Sheet tab (name + rows) for one Catalog entry.
   * The linked Spreadsheet's SheetID is resolved by Apps Script internally and is
   * never sent as a request parameter nor included in the response.
   */
  getDomainSheets(catalogId: string): Observable<GetDomainSheetsResponse> {
    const webAppUrl = this.config.getWebAppUrl();
    if (!webAppUrl) {
      return throwError(() => new Error('Google Apps Script Web App URL is not configured.'));
    }

    const endpoint = `${webAppUrl}?action=GET_SHEETS_NAMES&catalogId=${encodeURIComponent(catalogId)}`;
    const fetchPromise: Promise<unknown> = fetch(endpoint).then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    });

    return from(fetchPromise).pipe(map((data) => data as GetDomainSheetsResponse));
  }
}
