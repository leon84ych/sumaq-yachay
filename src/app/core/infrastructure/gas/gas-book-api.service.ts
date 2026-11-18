import {  Injectable } from "@angular/core";
import { BookPostPayload, GASResponseRaw, CloneBookItemPayload, CloneBookPayload, DeleteBookItemPayload, GASPaginatedResponseRaw, BookInfoRaw } from "./gas-model.model";
import { TOKEN_KEY } from "./gas-constants.constants";
import { GASAPI } from "./gas-api.service";



/**
 * GAS BE will always return EntityRow wich extends Record<string, unknown> 
 * This layer only know about Row entities, never Records
 * The loading screen is managed withing the UI layer
 * Only knows about the Raw values 
 */

@Injectable({
    providedIn: 'root',
})
export class GASBookAPI<TRaw, TRowValues> extends GASAPI {


    async getHealth(): Promise<string> {
        const webAppUrl = this.getWebAppUrl();
        if (!webAppUrl) {
            return Promise.reject(
                new Error(this.transloco.translate('BOOK_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED'))
            );
        }

        const idToken = localStorage.getItem(TOKEN_KEY);
        let endpoint = `${webAppUrl}?action=GET_CATALOG_HEALTH`;

        if (idToken) {
            endpoint += `&idToken=${encodeURIComponent(idToken)}`;
        }

        // Return the fetch promise directly without wrapping it in from()
        return fetch(endpoint).then(
            async (response) => {
                if (!response.ok) {
                    throw new Error(
                        this.transloco.translate('BOOK_DETAIL.ERRORS.HTTP_REQUEST_FAILED', {
                            status: response.status,
                        }),
                    );
                }
                const data: unknown = await response.json();
                this.captureRole(data);
                return data as string;
            },
        );
    }

    async getBooks(page: number, pageSize: number): Promise<GASResponseRaw<GASPaginatedResponseRaw<TRaw>>> {

        const webAppUrl = this.getWebAppUrl();
        if (!webAppUrl) {
            return Promise.reject(
                new Error(this.transloco.translate('BOOK_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED'))
            );
        }

        const idToken = localStorage.getItem(TOKEN_KEY);
        let endpoint = `${webAppUrl}?action=GET_CATALOG&page=${page}&pageSize=${pageSize}`;

        if (idToken) {
            endpoint += `&idToken=${encodeURIComponent(idToken)}`;
        }

        // Return the fetch promise directly without wrapping it in from()
        return fetch(endpoint).then(
            async (response) => {
                if (!response.ok) {
                    throw new Error(
                        this.transloco.translate('BOOK_DETAIL.ERRORS.HTTP_REQUEST_FAILED', {
                            status: response.status,
                        }),
                    );
                }
                const data: unknown = await response.json();
                this.captureRole(data);
                return data as GASResponseRaw<GASPaginatedResponseRaw<TRaw>>; // Delivers the whole array at once
            },
        );
    }

    /**
     * 
     */
    async getBookItem(row: number, id: string): Promise<GASResponseRaw<TRaw>> {

        const webAppUrl = this.getWebAppUrl();
        if (!webAppUrl) {
            return Promise.reject(
                new Error(this.transloco.translate('BOOK_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED'))
            );
        }

        const idToken = localStorage.getItem(TOKEN_KEY);
        let endpoint = `${webAppUrl}?action=GET_CATALOG_ITEM&row=${row}&id=${id}`;

        if (idToken) {
            endpoint += `&idToken=${encodeURIComponent(idToken)}`;
        }

        return fetch(endpoint).then(
            async (response) => {
                if (!response.ok) {
                    throw new Error(
                        this.transloco.translate('BOOK_DETAIL.ERRORS.HTTP_REQUEST_FAILED', {
                            status: response.status,
                        }),
                    );
                }
                const data: unknown = await response.json();
                this.captureRole(data);
                return data as GASResponseRaw<TRaw>;
            },
        );
    }


    async saveBook(id: string, row:number,
        rowValues: TRowValues,
    ): Promise<GASResponseRaw<TRaw>> {

        //1. Build the payload 
        const payload: BookPostPayload<TRowValues> = {
            action: row ? 'UPDATE_CATALOG_ITEM' : 'CREATE_CATALOG_ITEM',
            id: id,
            row: row,
            rowValues: rowValues,
        };
        return this.postBookPayload<TRaw>(payload);
    }

    async cloneBook(sheetUrl: string): Promise<GASResponseRaw<unknown>> {
        const payload: CloneBookPayload = { action: 'CLONE_CATALOG', SheetId: sheetUrl };
        return this.postBookPayload<unknown>(payload);
    }

    async cloneBookItem(sheetUrl: string): Promise<GASResponseRaw<TRaw>> {
        const payload: CloneBookItemPayload = { action: 'CLONE_CATALOG_ITEM', SheetId: sheetUrl };
        return this.postBookPayload<TRaw>(payload);
    }

    async deleteBookItem(row: number, id: string): Promise<GASResponseRaw<string>> {
        const payload: DeleteBookItemPayload = { action: 'DELETE_CATALOG_ITEM', row, id };
        return this.postBookPayload<string>(payload);
    }


    private async postBookPayload<T>(
        payload: BookPostPayload<TRowValues> | CloneBookPayload | CloneBookItemPayload | DeleteBookItemPayload,
    ): Promise<GASResponseRaw<T>> {

        const webAppUrl = this.getWebAppUrl();
        if (!webAppUrl) {
            throw new Error(this.transloco.translate('BOOK_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED'));
        }

        const idToken = localStorage.getItem(TOKEN_KEY);

        // 2. Attach token to payload
        const authenticatedPayload = {
            ...payload,
            idToken: idToken
        };

        const response = await fetch(webAppUrl, {
            method: 'POST',
            redirect: 'follow', // Automatically follow GAS 302 redirects
            headers: {
                'Content-Type': 'text/plain;charset=utf-8' // Keeps simple POST, avoids CORS preflight
            },
            body: JSON.stringify(authenticatedPayload)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: unknown = await response.json();
        this.captureRole(data);
        return data as GASResponseRaw<T>;
    }


    async getBookInfo(row: number): Promise<GASResponseRaw<BookInfoRaw>> {
        const webAppUrl = this.getWebAppUrl();

        const idToken = localStorage.getItem(TOKEN_KEY);
        let endpoint = `${webAppUrl}?action=GET_BOOK_INFO&row=${encodeURIComponent(row)}`;

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

        return data as GASResponseRaw<BookInfoRaw>;
    }

}