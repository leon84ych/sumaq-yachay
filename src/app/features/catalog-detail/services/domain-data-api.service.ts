import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { from, Observable, throwError } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';
import { PermissionService } from '../../../core/services/permission.service';
import { GetDomainSheetsResponse, PaginatedDomainRowsResponse } from '../models/domain-sheet.model';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function findCreatedRowId(value: unknown, depth = 0): string | null {
  if (!isRecord(value) || depth > 5) {
    return null;
  }

  for (const key of ['createdRowId', 'rowId']) {
    if (typeof value[key] === 'string' && value[key]) {
      return value[key] as string;
    }
  }

  for (const key of ['data', 'rowData', 'row', 'item', 'createdRow']) {
    const nestedId = findCreatedRowId(value[key], depth + 1);
    if (nestedId) {
      return nestedId;
    }
  }

  return typeof value['id'] === 'string' && value['id'] ? value['id'] : null;
}

@Injectable({
  providedIn: 'root',
})
export class DomainDataApiService {
  private config = inject(ConfigService);
  private authService = inject(GoogleAuthService);
  private transloco = inject(TranslocoService);
  private permissionService = inject(PermissionService);

  /**
   * HTTP GET: Fetches every Domain Data Sheet tab (name + rows) for one Catalog row.
   */
  getDomainSheets(row: number): Observable<GetDomainSheetsResponse> {
    if (this.config.isLocalSampleDataEnabled()) {
      return throwError(() => new Error('Remote requests are disabled in LocalSampleData mode.'));
    }

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
        const data: unknown = await response.json();
        this.captureRole(data);
        return data as GetDomainSheetsResponse;
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
    if (this.config.isLocalSampleDataEnabled()) {
      return throwError(() => new Error('Remote requests are disabled in LocalSampleData mode.'));
    }

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
        this.captureRole(data);
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
              role: this.permissionService.role(),
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

  private captureRole(response: unknown): void {
    if (isRecord(response) && typeof response['role'] === 'string') {
      this.permissionService.setRole(response['role']);
    }
  }

  /**
   * HTTP POST: Creates a new user-defined domain sheet with custom headers.
   */
  createSheet(row: number, sheetName: string, headers: string[]): Observable<any> {
    if (this.config.isLocalSampleDataEnabled()) {
      return throwError(() => new Error('Remote requests are disabled in LocalSampleData mode.'));
    }

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
      const data: unknown = await response.json();
      this.captureRole(data);
      return data;
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
    catalogItemId: string,
    createRowWithoutId = false,
  ): Observable<any> {
    if (this.config.isLocalSampleDataEnabled()) {
      return throwError(() => new Error('Remote requests are disabled in LocalSampleData mode.'));
    }

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

    const rows = createRowWithoutId
      ? updatedRows.map((record) => {
          const rowData = { ...record };
          delete rowData['id'];
          return rowData;
        })
      : updatedRows;

    const payload = {
      action: 'UPDATE_SHEET_ROWS',
      row: row,
      id: catalogItemId,
      sheetName: sheetName,
      rows,
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
      const data: unknown = await response.json();
      this.captureRole(data);
      const responseData = isRecord(data) ? data : null;
      if (!responseData || responseData['status'] !== 'success') {
        throw new Error(
          typeof responseData?.['message'] === 'string'
            ? responseData['message']
            : this.transloco.translate('CATALOG_DETAIL.ERRORS.UPDATE_ROWS_FAILED'),
        );
      }
      if (createRowWithoutId) {
        const createdRowId = findCreatedRowId(data);
        if (!createdRowId) {
          throw new Error('GAS did not return the ID assigned to the created row.');
        }
        return { ...responseData, createdRowId };
      }
      return data;
    });

    return from(fetchPromise);
  }

  /**
   * HTTP POST / Action: Deletes a row from a specific domain sheet.
   */
  deleteRow(
    row: number,
    sheetName: string,
    id: string,
    catalogItemId: string,
  ): Observable<unknown> {
    if (this.config.isLocalSampleDataEnabled()) {
      return throwError(() => new Error('Remote requests are disabled in LocalSampleData mode.'));
    }

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
            this.transloco.translate('CATALOG_DETAIL.ERRORS.AUTHENTICATION_REQUIRED_DELETE'),
          ),
      );
    }

    const payload = {
      action: 'DELETE_ROW',
      idToken,
      bookId: catalogItemId,
      row,
      sheetName,
      id,
    };

    const fetchPromise = fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
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

      const data: unknown = await response.json();
      this.captureRole(data);
      if (isRecord(data) && data['status'] === 'error') {
        throw new Error(
          typeof data['message'] === 'string'
            ? data['message']
            : this.transloco.translate('CATALOG_DETAIL.ERRORS.DELETE_ROW_FAILED'),
        );
      }
      return data;
    });

    return from(fetchPromise);
  }
}
