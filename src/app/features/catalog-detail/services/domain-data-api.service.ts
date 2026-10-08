import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { from, Observable, throwError } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';
import { GetDomainSheetsResponse } from '../models/domain-sheet.model';

@Injectable({
  providedIn: 'root',
})
export class DomainDataApiService {
  private config = inject(ConfigService);
  private authService = inject(GoogleAuthService);
  private transloco = inject(TranslocoService);

  /**
   * HTTP GET: Fetches every Domain Data Sheet tab (name + rows) for one Catalog row.
   */
  getDomainSheets(row: number): Observable<GetDomainSheetsResponse> {
    const webAppUrl = this.config.getWebAppUrl();
    if (!webAppUrl) {
      return throwError(() =>
        new Error(this.transloco.translate('CATALOG_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED'))
      );
    }

    const idToken = this.authService.idToken();
    let endpoint = `${webAppUrl}?action=GET_SHEETS_NAMES&row=${encodeURIComponent(row)}`;

    if (idToken) {
      endpoint += `&idToken=${encodeURIComponent(idToken)}`;
    }

    const fetchPromise: Promise<GetDomainSheetsResponse> = fetch(endpoint).then(async (response) => {
      if (!response.ok) {
        throw new Error(
          this.transloco.translate('CATALOG_DETAIL.ERRORS.HTTP_REQUEST_FAILED', {
            status: response.status,
          })
        );
      }
      return response.json() as Promise<GetDomainSheetsResponse>;
    });

    return from(fetchPromise);
  }

  /**
   * HTTP POST: Creates a new user-defined domain sheet with custom headers.
   */
  createSheet(row: number, sheetName: string, headers: string[]): Observable<any> {
    const webAppUrl = this.config.getWebAppUrl();
    if (!webAppUrl) {
      return throwError(() =>
        new Error(this.transloco.translate('CATALOG_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED'))
      );
    }

    const idToken = this.authService.idToken();
    if (!idToken) {
      return throwError(() =>
        new Error(this.transloco.translate('CATALOG_DETAIL.ERRORS.AUTHENTICATION_REQUIRED_CREATE'))
      );
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
        throw new Error(
          this.transloco.translate('CATALOG_DETAIL.ERRORS.HTTP_REQUEST_FAILED', {
            status: response.status,
          })
        );
      }
      return response.json();
    });

    return from(fetchPromise);
  }

  /**
   * HTTP POST / Action: Updates rows for a specific domain sheet.
   */
  updateRows(row: number, sheetName: string, updatedRows: Record<string, unknown>[]): Observable<any> {
    const webAppUrl = this.config.getWebAppUrl();
    if (!webAppUrl) {
      return throwError(() =>
        new Error(this.transloco.translate('CATALOG_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED'))
      );
    }

    const idToken = this.authService.idToken();
    if (!idToken) {
      return throwError(() =>
        new Error(this.transloco.translate('CATALOG_DETAIL.ERRORS.AUTHENTICATION_REQUIRED_UPDATE'))
      );
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
        throw new Error(
          this.transloco.translate('CATALOG_DETAIL.ERRORS.HTTP_REQUEST_FAILED', {
            status: response.status,
          })
        );
      }
      const data = await response.json();
      if (data && data.status === 'error') {
        throw new Error(
          data.message ||
            this.transloco.translate('CATALOG_DETAIL.ERRORS.UPDATE_ROWS_FAILED')
        );
      }
      return data;
    });

    return from(fetchPromise);
  }
}