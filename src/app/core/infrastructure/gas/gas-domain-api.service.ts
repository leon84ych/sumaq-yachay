import { Injectable } from "@angular/core";
import { GASAPI } from "./gas-api.service";
import { BookInfoRaw, CreateDomainResponseRaw, GASPaginatedResponseRaw, GASResponseRaw, SheetNamesRaw } from "./gas-model.model";
import { TOKEN_KEY } from "./gas-constants.constants";


/**
 * GAS BE will always return EntityRow wich extends Record<string, unknown> 
 * This layer only know about Row entities, never Records
 * The loading screen is managed withing the UI layer
 */
export const PAGE_SIZE = 50;

@Injectable({
    providedIn: 'root',
})
export class GASDomainAPI<TRaw, TRowValues> extends GASAPI {


    /**
     * HTTP GET: Retrieves the sheet (tab) names of the Domain Data owned by a Book row
     * @param row The row in the Book Item
     */
    async getSheetNames(row: number): Promise<GASResponseRaw<SheetNamesRaw>> {
        const webAppUrl = this.getWebAppUrl();
        if (!webAppUrl) {
            throw new Error(this.transloco.translate('BOOK_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED'));
        }

        const idToken = localStorage.getItem(TOKEN_KEY);
        let endpoint = `${webAppUrl}?action=GET_SHEETS_NAMES&row=${encodeURIComponent(row)}`;

        if (idToken) {
            endpoint += `&idToken=${encodeURIComponent(idToken)}`;
        }

        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error(
                this.transloco.translate('BOOK_DETAIL.ERRORS.HTTP_REQUEST_FAILED', {
                    status: response.status,
                }),
            );
        }
        const data: unknown = await response.json();
        this.captureRole(data);
        return data as GASResponseRaw<SheetNamesRaw>;
    }


    /**
    *
     * @param bookRow The row of the book in master catalog
     * @param domain The name of the sheet tobe retrieved
     * @param page The page number
     * @param pageSize The number of items per page
    * @returns
     */
    async getDomainPaginated(bookRow: number, domain: string, page: number, pageSize: number | null): Promise<GASResponseRaw<GASPaginatedResponseRaw<TRaw>>> {
        const webAppUrl = this.getWebAppUrl();

        const idToken = localStorage.getItem(TOKEN_KEY);
        const params = new URLSearchParams({
            action: 'GET_PAGINATED_ROWS',
            bookRow: String(bookRow),
            sheetName: domain,
            page: String(page),
            pageSize: String(pageSize ?? PAGE_SIZE),
        });

        if (idToken) {
            params.set('idToken', idToken);
        }

        const endpoint = `${webAppUrl}?${params.toString()}`;
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error(
                this.transloco.translate('BOOK_DETAIL.ERRORS.HTTP_REQUEST_FAILED', {
                    status: response.status,
                }),
            );
        }
        const data: unknown = await response.json();
        this.captureRole(data);

        return data as GASResponseRaw<GASPaginatedResponseRaw<TRaw>>;
    }



    /**
       * HTTP POST: Creates a new user-defined domain sheet with custom headers.
       */
      async createDomain(row: number, domain: string, headers: string[]): Promise<GASResponseRaw<CreateDomainResponseRaw>> {

        const webAppUrl = this.getWebAppUrl();
        const idToken = localStorage.getItem(TOKEN_KEY);
    
        // Construct the payload matching what doPost() and Router.routePost expect
        const payload = {
          action: 'CREATE_DOMAIN',
          row: row,
          domain: domain,
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
              this.transloco.translate('BOOK_DETAIL.ERRORS.HTTP_REQUEST_FAILED', {
                status: response.status,
              }),
            );
          }
          const data: unknown = await response.json();
          this.captureRole(data);
          return data;
        });
        const data: unknown = await fetchPromise;
        this.captureRole(data);
        return data as GASResponseRaw<CreateDomainResponseRaw>;
      }




    async addDomainItem(
        row: number,
        bookId: string,
        domain: string,
        rowData: Record<string, unknown>,
        signal?: AbortSignal,
    ): Promise<string> {
        const webAppUrl = this.getWebAppUrl();
        if (!webAppUrl) {
            throw new Error(this.transloco.translate('BOOK_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED'));
        }

        const idToken = localStorage.getItem(TOKEN_KEY);
        if (!idToken) {
            throw new Error(this.transloco.translate('BOOK_DETAIL.ERRORS.AUTHENTICATION_REQUIRED_UPDATE'));
        }

        const response = await fetch(webAppUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            ...(signal ? { signal } : {}),
            body: JSON.stringify({
                action: 'CREATE_ROW',
                id: bookId,
                row,
                sheetName: domain,
                rows: [rowData],
                idToken,
            }),
        });

        if (!response.ok) {
            throw new Error(
                this.transloco.translate('BOOK_DETAIL.ERRORS.HTTP_REQUEST_FAILED', {
                    status: response.status,
                }),
            );
        }

        const data: unknown = await response.json();
        this.captureRole(data);
        const responseRecord = this.asRecord(data);
        if (responseRecord?.['status'] !== 'success') {
            throw new Error(
                typeof responseRecord?.['message'] === 'string'
                    ? responseRecord['message']
                    : this.transloco.translate('BOOK_DETAIL.ERRORS.UPDATE_ROWS_FAILED'),
            );
        }

        const createdRowId = this.findCreatedRowId(data);
        if (!createdRowId) {
            throw new Error('GAS did not return the ID assigned to the created row.');
        }
        return createdRowId;
    }

    async updateDomainItem(
        row: number,
        bookId: string,
        domain: string,
        itemId: string,
        rowData: Record<string, unknown>,
        signal?: AbortSignal,
    ): Promise<void> {
        const webAppUrl = this.getWebAppUrl();
        if (!webAppUrl) {
            throw new Error(this.transloco.translate('BOOK_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED'));
        }

        const idToken = localStorage.getItem(TOKEN_KEY);
        if (!idToken) {
            throw new Error(this.transloco.translate('BOOK_DETAIL.ERRORS.AUTHENTICATION_REQUIRED_UPDATE'));
        }

        const updateRow = {
            ...rowData,
            bookRow: row,
            itemRow: rowData['itemRow'],
            itemId,
        };

        const response = await fetch(webAppUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            ...(signal ? { signal } : {}),
            body: JSON.stringify({
                action: 'UPDATE_ROW',
                id: bookId,
                row,
                sheetName: domain,
                rows: [updateRow],
                idToken,
            }),
        });

        if (!response.ok) {
            throw new Error(
                this.transloco.translate('BOOK_DETAIL.ERRORS.HTTP_REQUEST_FAILED', {
                    status: response.status,
                }),
            );
        }

        const data: unknown = await response.json();
        this.captureRole(data);
        const responseRecord = this.asRecord(data);
        if (responseRecord?.['status'] !== 'success') {
            throw new Error(
                typeof responseRecord?.['message'] === 'string'
                    ? responseRecord['message']
                    : this.transloco.translate('BOOK_DETAIL.ERRORS.UPDATE_ROWS_FAILED'),
            );
        }
    }

    async deleteDomainItem(bookRow: number, bookId: string, domain: string, itemId: string, itemRow: number, signal?: AbortSignal): Promise<void> {
        const webAppUrl = this.getWebAppUrl();
        if (!webAppUrl) {
            throw new Error(this.transloco.translate('BOOK_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED'));
        }

        const idToken = localStorage.getItem(TOKEN_KEY);
        if (!idToken) {
            throw new Error(this.transloco.translate('BOOK_DETAIL.ERRORS.AUTHENTICATION_REQUIRED_DELETE'));
        }

            const response = await fetch(webAppUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                ...(signal ? { signal } : {}),
                body: JSON.stringify({
                    action: 'DELETE_ROW',
                    idToken,
                    bookId,
                    bookRow,
                    sheetName: domain,
                    itemId: itemId,
                    itemRow: itemRow
                }),
        });

        if (!response.ok) {
            throw new Error(
                this.transloco.translate('BOOK_DETAIL.ERRORS.HTTP_REQUEST_FAILED', {
                    status: response.status,
                }),
            );
        }

        const data: unknown = await response.json();
        this.captureRole(data);
        const responseRecord = this.asRecord(data);
        if (responseRecord?.['status'] !== 'success') {
            throw new Error(
            typeof responseRecord?.['message'] === 'string'
                    ? responseRecord['message']
                    : this.transloco.translate('BOOK_DETAIL.ERRORS.DELETE_ROW_FAILED'),
            );
        }
    }

    private asRecord(value: unknown): Record<string, unknown> | null {
        return typeof value === 'object' && value !== null && !Array.isArray(value)
            ? value as Record<string, unknown>
            : null;
    }

    private findCreatedRowId(value: unknown, depth = 0): string | null {
        const record = this.asRecord(value);
        if (!record || depth > 5) {
            return null;
        }

        for (const key of ['createdRowId', 'rowId']) {
            if (typeof record[key] === 'string' && record[key]) {
                return record[key] as string;
            }
        }

        for (const key of ['data', 'rowData', 'row', 'item', 'createdRow']) {
            const nestedId = this.findCreatedRowId(record[key], depth + 1);
            if (nestedId) {
                return nestedId;
            }
        }

        return typeof record['id'] === 'string' && record['id'] ? record['id'] : null;
    }
}