import { Injectable, inject } from '@angular/core';
import { from, Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigService } from '../../../core/services/config.service';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';
import { GetDomainSheetsResponse } from '../models/domain-sheet.model';

@Injectable({
  providedIn: 'root',
})
export class DomainDataApiService {
  private config = inject(ConfigService);
  private authService = inject(GoogleAuthService);

  /**
   * HTTP GET: Fetches every Domain Data Sheet tab (name + rows) for one Catalog row.
   */
  getDomainSheets(row: number): Observable<GetDomainSheetsResponse> {
    const sampleUrl = 'sample-responses/get-domain-sheets.sample.json';

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

    const idToken = this.authService.idToken();
    let endpoint = `${webAppUrl}?action=GET_SHEETS_NAMES&row=${encodeURIComponent(row)}`;

    if (idToken) {
      endpoint += `&idToken=${encodeURIComponent(idToken)}`;
    }

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
   * HTTP POST: Creates a new user-defined domain sheet with custom headers.
   */
  createSheet(row: number, sheetName: string, headers: string[]): Observable<any> {
    const webAppUrl = this.config.getWebAppUrl();
    if (!webAppUrl) {
      return throwError(() => new Error('Google Apps Script Web App URL is not configured.'));
    }

    const idToken = this.authService.idToken();
    if (!idToken && !this.config.useSampleData()) {
      return throwError(() => new Error('Authentication required to create a sheet.'));
    }

    // Construct the payload matching what doPost() and Router.routePost expect
    const payload = {
      action: 'CREATE_SHEET',
      row: row,
      sheetName: sheetName,
      headers: headers,
      idToken: idToken
    };

    const fetchPromise = fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Standard workaround for GAS CORS/POST handling
      },
      body: JSON.stringify(payload)
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    });

    return from(fetchPromise);
  }

  private pickSampleResponseForRow(data: unknown, row: number): unknown {
    if (!Array.isArray(data)) {
      return data;
    }
    return data.find((entry) => entry?.data?.row === row) ?? data[0];
  }

  /**
   * HTTP POST / Action: Updates rows for a specific domain sheet.
   */
  updateRows(row: number, sheetName: string, updatedRows: Record<string, unknown>[]): Observable<any> {
    const webAppUrl = this.config.getWebAppUrl();
    if (!webAppUrl) {
      return throwError(() => new Error('Google Apps Script Web App URL is not configured.'));
    }

    const idToken = this.authService.idToken();
    if (!idToken && !this.config.useSampleData()) {
      return throwError(() => new Error('Authentication required to update sheet rows.'));
    }

    const payload = {
      action: 'UPDATE_SHEET_ROWS',
      row: row,
      sheetName: sheetName,
      rows: updatedRows,
      idToken: idToken
    };

    const fetchPromise = fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Solución estándar para evitar bloqueos CORS y preflight en GAS
      },
      body: JSON.stringify(payload),
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      if (data && data.status === 'error') {
        throw new Error(data.message || 'Failed to update domain sheet rows.');
      }
      return data;
    });

    return from(fetchPromise);
  }
}