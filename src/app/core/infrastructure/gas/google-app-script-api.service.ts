import { inject, Injectable, signal } from "@angular/core";
import { TranslocoService } from "@jsverse/transloco";
import { PermissionService } from "../../services/permission/permission.service";
import { CatalogPostPayload, CatalogRaw, CatalogResponseRaw, CloneCatalogPayload, PaginatedResponseRaw } from "./gas-model.model";
import { getCatalogRowValues } from "./gas-mapper.mapper";
import { DEFAULT_GAS_TIMEOUT_MS, DEFAULT_WEB_APP_URL, TOKEN_KEY, WEB_APP_URL_KEY } from "./gas-constants.constants";
import { CatalogRecord } from "../../../features/domain-1/catalog/models/catalog-item.model";
import { SyncStatus } from "../../../features/domain-1/shared/model/domain-shared-model";




/**
 * GAS BE will always return EntityRow wich extends Record<string, unknown> 
 * This layer only know about Row entities, never Records
 * The loading screen is managed withing the UI layer
 */

@Injectable({
    providedIn: 'root',
})
export class GoogleAppScriptAPI {

    private transloco = inject(TranslocoService);
    private permissionService = inject(PermissionService);

    private urlSignal = signal<string>(this.loadStoredUrl());
    private timeoutSignal = signal(DEFAULT_GAS_TIMEOUT_MS);

    readonly webAppUrl = this.urlSignal.asReadonly();



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

    async getCatalog(page: number, pageSize: number): Promise<CatalogResponseRaw<PaginatedResponseRaw<CatalogRaw>>> {

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
                return data as CatalogResponseRaw<PaginatedResponseRaw<CatalogRaw>>; // Delivers the whole array at once
            },
        );
    }


    async saveCatalogItem(
        itemInput: CatalogRecord,
    ): Promise<CatalogResponseRaw<CatalogRaw>> {

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

    async cloneCatalog(sheetUrl: string): Promise<CatalogResponseRaw<unknown>> {
        const payload: CloneCatalogPayload = { action: 'CLONE_CATALOG', SheetId: sheetUrl };
        return this.postCatalogPayload<unknown>(payload);
    }

    async cloneCatalogItem(sheetUrl: string): Promise<CatalogResponseRaw<CatalogRaw>> {
        
        const webAppUrl = this.getWebAppUrl();
        if (!webAppUrl) {
            return Promise.reject(
                new Error(this.transloco.translate('CATALOG_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED'))
            );
        }

        const idToken = localStorage.getItem(TOKEN_KEY);
        let endpoint = `${webAppUrl}?action=CLONE_CATALOG_ITEM&sheetUrl=${encodeURIComponent(sheetUrl)}`;

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
                return data as CatalogResponseRaw<CatalogRaw>;
            },
        );
    }

    // /**
    //  * HTTP POST: Optimistically save or update an item locally and push to Google Sheets
    //  */
    // async saveItem(
    //     itemInput: Omit<CatalogRow, 'updatedAt' | 'syncStatus'>,
    //     isEdit: boolean,
    //     originalId?: string // Pass original ID to handle primary key renames during edits
    // ): Promise<void> {
    //     const localSampleDataEnabled = this.configService.isLocalSampleDataEnabled();
    //     const localRow = localSampleDataEnabled && !itemInput.row
    //         ? Math.max(0, ...this.items().map((existing) => existing.row)) + 1
    //         : itemInput.row;
    //     const now = new Date().toISOString();
    //     const item: CatalogItem = {
    //         ...itemInput,
    //         row: localRow,
    //         updatedAt: now,
    //         syncStatus: localSampleDataEnabled ? 'synced' : 'pending',
    //     };

    //     // Handle key mutation in IndexedDB if the ID changed during an edit
    //     if (isEdit && originalId && originalId !== item.id) {
    //         await this.dbService.db.catalogs.delete(originalId);
    //         this.removeLocalItemInState(originalId); // Helper to clear state array
    //     }

    //     const operation = this.globalLoadingService.begin();

    //     // 1. Optimistic local update
    //     await this.dbService.db.catalogs.put(item);
    //     this.updateLocalItemInState(item);

    //     if (localSampleDataEnabled) {
    //         this.globalLoadingService.end(operation);
    //         return;
    //     }

    //     // 2. Prepare POST payload for Apps Script
    //     const payload: CatalogPostPayload = {
    //         action: isEdit ? 'UPDATE_CATALOG_ITEM' : 'CREATE_CATALOG_ITEM',
    //         id: item.id,
    //         row: item.row,
    //         rowValues: mapCatalogItemToRowValues(item),
    //     };

    //     // 3. Send over HTTP POST to GAS
    //     try {
    //         const res = await firstValueFrom(this.apiService.saveCatalogItem(payload));

    //         if (res && res.status === 'success') {
    //             const serverData = res.data || {};

    //             const syncedItem: CatalogItem = {
    //                 ...item,
    //                 row: serverData.row || item.row,
    //                 updatedAt: serverData.updatedAt || item.updatedAt,
    //                 syncStatus: serverData.syncStatus || 'synced',
    //             };

    //             await this.dbService.db.catalogs.put(syncedItem);
    //             this.updateLocalItemInState(syncedItem);
    //         } else {
    //             throw new Error(res?.message || 'Remote save failed');
    //         }
    //     } catch (err: unknown) {
    //         console.error('Remote POST save failed, marked as error:', err);
    //         const errorItem: CatalogItem = { ...item, syncStatus: 'error' };
    //         await this.dbService.db.catalogs.put(errorItem);
    //         this.updateLocalItemInState(errorItem);
    //     } finally {
    //         this.globalLoadingService.end(operation);
    //     }
    // }

    //   async cloneCatalogItemFromSheet(sheetUrl: string): Promise<boolean> {
    //     if (this.configService.isLocalSampleDataEnabled()) {
    //       this.errorMessage.set('CATALOG.ERRORS.cloneItemUnavailable');
    //       return false;
    //     }
    //     if (!this.authService.idToken()) {
    //       this.errorMessage.set('CATALOG.ERRORS.authRequired');
    //       return false;
    //     }
    //     if (this.isLoading()) return false;

    //     const operation = this.globalLoadingService.begin();
    //     this.isLoading.set(true);
    //     this.errorMessage.set(null);
    //     try {
    //       const payload: CloneCatalogItemPayload = { action: 'CLONE_CATALOG_ITEM', SheetId: sheetUrl };
    //       const response = await firstValueFrom(this.apiService.cloneCatalogItem(payload));
    //       if (response?.status !== 'success') {
    //         throw new Error(response?.message || 'CATALOG.ERRORS.cloneItemFailed');
    //       }
    //       await this.syncFromRemote();
    //       if (this.errorMessage()) {
    //         this.errorMessage.set('CATALOG.ERRORS.cloneItemRefreshFailed');
    //         return false;
    //       }
    //       return true;
    //     } catch (error: unknown) {
    //       this.errorMessage.set(error instanceof Error && error.message
    //         ? error.message : 'CATALOG.ERRORS.cloneItemFailed');
    //       return false;
    //     } finally {
    //       this.isLoading.set(false);
    //       this.globalLoadingService.end(operation);
    //     }
    //   }

    //   async addCatalogFromSheet(sheetUrl: string): Promise<boolean> {
    //     if (this.configService.isLocalSampleDataEnabled() || this.items().length > 0) {
    //       this.errorMessage.set('CATALOG.ERRORS.copyCatalogUnavailable');
    //       return false;
    //     }

    //     if (!this.authService.idToken()) {
    //       this.errorMessage.set('CATALOG.ERRORS.authRequired');
    //       return false;
    //     }

    //     const operation = this.globalLoadingService.begin();
    //     this.isLoading.set(true);
    //     this.errorMessage.set(null);

    //     try {
    //       const payload: CopyCatalogPayload = {
    //         action: 'CLONE_CATALOG',
    //         SheetId: sheetUrl,
    //       };
    //       const response = await firstValueFrom(this.apiService.copyCatalog(payload));
    //       if (response?.status !== 'success') {
    //         throw new Error(response?.message || 'Catalog copy failed');
    //       }

    //       await this.syncFromRemote();
    //       return true;
    //     } catch (error: unknown) {
    //       console.error('Google Sheet catalog request failed:', error);
    //       this.errorMessage.set(
    //         error instanceof Error && error.message
    //           ? error.message
    //           : 'CATALOG.ERRORS.copyCatalogFailed',
    //       );
    //       return false;
    //     } finally {
    //       this.isLoading.set(false);
    //       this.globalLoadingService.end(operation);
    //     }
    //   }

    /**
    * HTTP GET: Fetches Catalog Item by Number
    * @param row the number in the sheet corresponding to the desired catalog item
    */
    // getCatalogItemByNumber(row: number): Observable<Record<string, unknown>> {

    //     const webAppUrl = this.getWebAppUrl();
    //     if (!webAppUrl) {
    //         return throwError(
    //             () =>
    //                 new Error(this.transloco.translate('CATALOG_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED')),
    //         );
    //     }

    //     const idToken = localStorage.getItem(TOKEN_KEY);
    //     let endpoint = `${webAppUrl}?action=GET_SHEETS_NAMES&row=${encodeURIComponent(row)}`;

    //     if (idToken) {
    //         endpoint += `&idToken=${encodeURIComponent(idToken)}`;
    //     }

    //     const fetchPromise: Promise<Record<string, unknown>> = fetch(endpoint).then(
    //         async (response) => {
    //             if (!response.ok) {
    //                 throw new Error(
    //                     this.transloco.translate('CATALOG_DETAIL.ERRORS.HTTP_REQUEST_FAILED', {
    //                         status: response.status,
    //                     }),
    //                 );
    //             }
    //             const data: unknown = await response.json();
    //             this.captureRole(data);
    //             return data as Record<string, unknown>;
    //         },
    //     );

    //     return from(fetchPromise);
    // }


    getWebAppUrl(): string {
        return this.urlSignal();
    }

    getGasTimeoutMs(): number {
        return this.timeoutSignal();
    }

    private loadStoredUrl(): string {
        try {
            return localStorage.getItem(WEB_APP_URL_KEY) || DEFAULT_WEB_APP_URL;
        } catch {
            return DEFAULT_WEB_APP_URL;
        }
    }

    private captureRole(response: unknown): void {
        if (this.isRecord(response) && typeof response['role'] === 'string') {
            this.permissionService.setRole(response['role']);
        }
    }

    private isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }


    private async postCatalogPayload<T>(payload: CatalogPostPayload | CloneCatalogPayload): Promise<CatalogResponseRaw<T>> {

        const webAppUrl = this.getWebAppUrl();
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
        return data as CatalogResponseRaw<T>;
    }

}