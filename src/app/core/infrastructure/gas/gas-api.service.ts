import { inject, Injectable, signal } from "@angular/core";
import { TranslocoService } from "@jsverse/transloco";
import { PermissionService } from "../../services/permission/permission.service";
import { CatalogPostPayload, CatalogRaw, GASResponseRaw, CloneCatalogItemPayload, CloneCatalogPayload, DeleteCatalogItemPayload, PaginatedResponseRaw } from "./gas-model.model";
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
export class GASAPI {

    protected transloco = inject(TranslocoService);
    protected permissionService = inject(PermissionService);

    protected urlSignal = signal<string>(this.loadStoredUrl());
    protected timeoutSignal = signal(DEFAULT_GAS_TIMEOUT_MS);

    readonly webAppUrl = this.urlSignal.asReadonly();


    protected loadStoredUrl(): string {
        try {
            return localStorage.getItem(WEB_APP_URL_KEY) || DEFAULT_WEB_APP_URL;
        } catch {
            return DEFAULT_WEB_APP_URL;
        }
    }

    protected getWebAppUrl(): string {
        return this.urlSignal();
    }

    protected getGasTimeoutMs(): number {
        return this.timeoutSignal();
    }

    protected captureRole(response: unknown): void {
        if (this.isRecord(response) && typeof response['role'] === 'string') {
            this.permissionService.setRole(response['role']);
        }
    }

    protected isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

}