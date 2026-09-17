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
   * HTTP GET: Fetches every Domain Data Sheet tab (name + rows) for one Catalog row.
   * The linked Spreadsheet's SheetID is resolved by Apps Script internally and is
   * never sent as a request parameter nor included in the response.
   */
  getDomainSheets(row: number): Observable<GetDomainSheetsResponse> {
    const sampleUrl = '/sample-responses/get-domain-sheets.sample.json';

    if (this.config.useSampleData()) {
      this.config.setSampleDataFallbackActive(false);
      const fetchPromise: Promise<unknown> = fetch(sampleUrl)
        .then((response) => response.json())
        .then((data) => this.pickSampleResponseForRow(data, row));
      return from(fetchPromise).pipe(map((data) => data as GetDomainSheetsResponse));
    }

    const webAppUrl = this.config.getWebAppUrl();
    if (!webAppUrl) {
      return throwError(() => new Error('Google Apps Script Web App URL is not configured.'));
    }

    const endpoint = `${webAppUrl}?action=GET_SHEETS_NAMES&row=${encodeURIComponent(row)}`;

    // Falls back to the local sample response if the live endpoint 404s (e.g. stale deployment).
    const fetchPromise: Promise<unknown> = fetch(endpoint).then((response) => {
      if (response.status === 404) {
        console.warn(`GET ${endpoint} returned 404; falling back to sample data (${sampleUrl}).`);
        this.config.setSampleDataFallbackActive(true);
        return fetch(sampleUrl)
          .then((sampleResponse) => sampleResponse.json())
          .then((data) => this.pickSampleResponseForRow(data, row));
      }
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      this.config.setSampleDataFallbackActive(false);
      return response.json();
    });

    return from(fetchPromise).pipe(map((data) => data as GetDomainSheetsResponse));
  }

  /**
   * The sample file holds one response per Catalog row; pick the match, falling back to the first entry.
   */
  private pickSampleResponseForRow(data: unknown, row: number): unknown {
    if (!Array.isArray(data)) {
      return data;
    }
    return data.find((entry) => entry?.data?.row === row) ?? data[0];
  }

}
