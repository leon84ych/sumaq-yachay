import { Injectable } from "@angular/core";
import { GASAPI } from "./gas-api.service";
import { GASResponseRaw, SheetNamesRaw } from "./gas-model.model";
import { TOKEN_KEY } from "./gas-constants.constants";


/**
 * GAS BE will always return EntityRow wich extends Record<string, unknown> 
 * This layer only know about Row entities, never Records
 * The loading screen is managed withing the UI layer
 */

@Injectable({
    providedIn: 'root',
})
export class GASDomainAPI extends GASAPI{

    /**
     * HTTP GET: Retrieves the sheet (tab) names of the Domain Data owned by a Catalog row
     * @param row The row in the Catalog Item
     */
    async getSheetNames(row: number): Promise<GASResponseRaw<SheetNamesRaw>> {
        const webAppUrl = this.getWebAppUrl();
        if (!webAppUrl) {
            throw new Error(this.transloco.translate('CATALOG_DETAIL.ERRORS.WEB_APP_URL_NOT_CONFIGURED'));
        }

        const idToken = localStorage.getItem(TOKEN_KEY);
        let endpoint = `${webAppUrl}?action=GET_SHEETS_NAMES&row=${encodeURIComponent(row)}`;

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
        return data as GASResponseRaw<SheetNamesRaw>;
    }

    

}