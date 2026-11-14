import { inject, Injectable, signal } from "@angular/core";
import { TranslocoService } from "@jsverse/transloco";
import { PermissionService } from "../../services/permission/permission.service";
import { CatalogPostPayload, CatalogRaw, GASResponseRaw, CloneCatalogItemPayload, CloneCatalogPayload, DeleteCatalogItemPayload, GASPaginatedResponseRaw, BookInfoRaw } from "./gas-model.model";
import { getCatalogRowValues } from "./gas-mapper.mapper";
import { DEFAULT_GAS_TIMEOUT_MS, DEFAULT_WEB_APP_URL, TOKEN_KEY, WEB_APP_URL_KEY } from "./gas-constants.constants";
import { CatalogRecord } from "../../../features/catalog/models/catalog-item.model";
import { SyncStatus } from "../../../features/domain-1/shared/model/domain-shared-model";
import { GASAPI } from "./gas-api.service";




/**
 * GAS BE will always return EntityRow wich extends Record<string, unknown> 
 * This layer only know about Row entities, never Records
 * The loading screen is managed withing the UI layer
 */

@Injectable({
    providedIn: 'root',
})
export class GASCatalogAPI extends GASAPI {


    async getHealth(): Promise<string> {
        const webAppUrl = this.getWebAppUrl();
        if (!webAppUrl) {
            return Promise.reject(
                new Error(this.transloco.translate('CATALOG_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED'))
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
                        this.transloco.translate('CATALOG_DETAIL.ERRORS.HTTP_REQUEST_FAILED', {
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

    async getCatalog(page: number, pageSize: number): Promise<GASResponseRaw<GASPaginatedResponseRaw<CatalogRaw>>> {

        const webAppUrl = this.getWebAppUrl();
        if (!webAppUrl) {
            return Promise.reject(
                new Error(this.transloco.translate('CATALOG_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED'))
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
                        this.transloco.translate('CATALOG_DETAIL.ERRORS.HTTP_REQUEST_FAILED', {
                            status: response.status,
                        }),
                    );
                }
                const data: unknown = await response.json();
                this.captureRole(data);
                return data as GASResponseRaw<GASPaginatedResponseRaw<CatalogRaw>>; // Delivers the whole array at once
            },
        );
    }

    /**
     * 
     */
    async getCatalogItem(row: number, id: string): Promise<GASResponseRaw<CatalogRaw>> {

        const webAppUrl = this.getWebAppUrl();
        if (!webAppUrl) {
            return Promise.reject(
                new Error(this.transloco.translate('CATALOG_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED'))
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
                        this.transloco.translate('CATALOG_DETAIL.ERRORS.HTTP_REQUEST_FAILED', {
                            status: response.status,
                        }),
                    );
                }
                const data: unknown = await response.json();
                this.captureRole(data);
                return data as GASResponseRaw<CatalogRaw>;
            },
        );
    }


    async saveCatalogItem(
        itemInput: CatalogRecord,
    ): Promise<GASResponseRaw<CatalogRaw>> {

        //1. Build the payload 
        const now = new Date().toISOString();
        const item: CatalogRecord = {
            ...itemInput,
            updatedAt: now,
            syncStatus: SyncStatus.PENDING,
        };

        const payload: CatalogPostPayload = {
            action: item.row ? 'UPDATE_CATALOG_ITEM' : 'CREATE_CATALOG_ITEM',
            id: item.id,
            row: item.row,
            rowValues: getCatalogRowValues(item),
        };
        return this.postCatalogPayload<CatalogRaw>(payload);
    }

    async cloneCatalog(sheetUrl: string): Promise<GASResponseRaw<unknown>> {
        const payload: CloneCatalogPayload = { action: 'CLONE_CATALOG', SheetId: sheetUrl };
        return this.postCatalogPayload<unknown>(payload);
    }

    async cloneCatalogItem(sheetUrl: string): Promise<GASResponseRaw<CatalogRaw>> {
        const payload: CloneCatalogItemPayload = { action: 'CLONE_CATALOG_ITEM', SheetId: sheetUrl };
        return this.postCatalogPayload<CatalogRaw>(payload);
    }

    async deleteCatalogItem(row: number, id: string): Promise<GASResponseRaw<string>> {
        const payload: DeleteCatalogItemPayload = { action: 'DELETE_CATALOG_ITEM', row, id };
        return this.postCatalogPayload<string>(payload);
    }


    private async postCatalogPayload<T>(
        payload: CatalogPostPayload | CloneCatalogPayload | CloneCatalogItemPayload | DeleteCatalogItemPayload,
    ): Promise<GASResponseRaw<T>> {

        const webAppUrl = this.getWebAppUrl();
        if (!webAppUrl) {
            throw new Error(this.transloco.translate('CATALOG_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED'));
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
                this.transloco.translate('CATALOG_DETAIL.ERRORS.HTTP_REQUEST_FAILED', {
                    status: response.status,
                }),
            );
        }
        const data: unknown = await response.json();
        this.captureRole(data);

        return data as GASResponseRaw<BookInfoRaw>;
    }

}