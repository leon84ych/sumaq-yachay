import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { from, Observable, throwError } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';
import { GetDomainSheetsResponse, PaginatedDomainRowsResponse } from '../models/domain-sheet.model';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
      return throwError(
        () =>
          new Error(this.transloco.translate('CATALOG_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED')),
      );
    }

    const idToken = this.authService.idToken();
    let endpoint = `${webAppUrl}?action=GET_SHEETS_NAMES&row=${encodeURIComponent(row)}`;

    if (idToken) {
      endpoint += `&idToken=${encodeURIComponent(idToken)}`;
    }

    const fetchPromise: Promise<GetDomainSheetsResponse> = fetch(endpoint).then(
      async (response) => {
        if (!response.ok) {
          throw new Error(
            this.transloco.translate('CATALOG_DETAIL.ERRORS.HTTP_REQUEST_FAILED', {
              status: response.status,
            }),
          );
        }
        return response.json() as Promise<GetDomainSheetsResponse>;
      },
    );

    return from(fetchPromise);
  }

  getPaginatedRows(
    row: number,
    sheetName: string,
    page: number,
    pageSize: number,
  ): Observable<PaginatedDomainRowsResponse> {
    const webAppUrl = this.config.getWebAppUrl();
    if (!webAppUrl) {
      return throwError(
        () =>
          new Error(this.transloco.translate('CATALOG_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED')),
      );
    }

    const idToken = this.authService.idToken();
    if (!idToken) {
      return throwError(
        () =>
          new Error(this.transloco.translate('CATALOG_DETAIL.ERRORS.AUTHENTICATION_REQUIRED_READ')),
      );
    }

    const endpoint = new URL(webAppUrl);
    endpoint.searchParams.set('action', 'GET_PAGINATED_ROWS');
    endpoint.searchParams.set('row', String(row));
    endpoint.searchParams.set('sheetName', sheetName);
    endpoint.searchParams.set('page', String(page));
    endpoint.searchParams.set('pageSize', String(pageSize));
    endpoint.searchParams.set('idToken', idToken);

    const fetchPromise = fetch(endpoint).then(async (response) => {
      if (!response.ok) {
        throw new Error(
          this.transloco.translate('CATALOG_DETAIL.ERRORS.HTTP_REQUEST_FAILED', {
            status: response.status,
          }),
        );
      }

      let data: unknown = await response.json();
      while (isRecord(data)) {
        if (data['status'] === 'error') {
          throw new Error(
            typeof data['message'] === 'string'
              ? data['message']
              : 'Failed to fetch paginated domain rows.',
          );
        }
        if (Array.isArray(data['rows'])) {
          return {
            row: this.readNumber(data['row'], row),
            sheetName: String(data['sheetName'] ?? sheetName),
            page: this.readNumber(data['page'], page),
            pageSize: this.readNumber(data['pageSize'], pageSize),
            totalRows: this.readNumber(data['totalRows'], data['rows'].length),
            totalPages: this.readNumber(data['totalPages'], page),
            rows: data['rows'].filter(isRecord),
          };
        }
        data = data['data'];
      }

      throw new Error('Malformed paginated domain response: rows array is missing.');
    });

    return from(fetchPromise);
  }

  private readNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  /**
   * HTTP POST: Creates a new user-defined domain sheet with custom headers.
   */
  createSheet(row: number, sheetName: string, headers: string[]): Observable<any> {
    const webAppUrl = this.config.getWebAppUrl();
    if (!webAppUrl) {
      return throwError(
        () =>
          new Error(this.transloco.translate('CATALOG_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED')),
      );
    }

    const idToken = this.authService.idToken();
    if (!idToken) {
      return throwError(
        () =>
          new Error(
            this.transloco.translate('CATALOG_DETAIL.ERRORS.AUTHENTICATION_REQUIRED_CREATE'),
          ),
      );
    }

    // Construct the payload matching what doPost() and Router.routePost expect
    const payload = {
      action: 'CREATE_SHEET',
      row: row,
      sheetName: sheetName,
      headers: headers,
      idToken: idToken,
    };

    const fetchPromise = fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Standard workaround for GAS CORS/POST handling
      },
      body: JSON.stringify(payload),
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(
          this.transloco.translate('CATALOG_DETAIL.ERRORS.HTTP_REQUEST_FAILED', {
            status: response.status,
          }),
        );
      }
      return response.json();
    });

    return from(fetchPromise);
  }

  /**
   * HTTP POST / Action: Updates rows for a specific domain sheet.
   */
  updateRows(
    row: number,
    sheetName: string,
    updatedRows: Record<string, unknown>[],
  ): Observable<any> {
    const webAppUrl = this.config.getWebAppUrl();
    if (!webAppUrl) {
      return throwError(
        () =>
          new Error(this.transloco.translate('CATALOG_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED')),
      );
    }

    const idToken = this.authService.idToken();
    if (!idToken) {
      return throwError(
        () =>
          new Error(
            this.transloco.translate('CATALOG_DETAIL.ERRORS.AUTHENTICATION_REQUIRED_UPDATE'),
          ),
      );
    }

    const payload = {
      action: 'UPDATE_SHEET_ROWS',
      row: row,
      sheetName: sheetName,
      rows: updatedRows,
      idToken: idToken,
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
          }),
        );
      }
      const data = await response.json();
      if (data && data.status === 'error') {
        throw new Error(
          data.message || this.transloco.translate('CATALOG_DETAIL.ERRORS.UPDATE_ROWS_FAILED'),
        );
      }
      return data;
    });

    return from(fetchPromise);
  }
}
