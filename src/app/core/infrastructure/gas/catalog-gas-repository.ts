import { inject } from "@angular/core";
import { CatalogRepositoryInterface } from "../catalog-repository-interface";
import { GoogleAppScriptAPI } from "./google-app-script-api";
import { CatalogRecord } from "../../../features/domain-2/catalog-1/models/catalog-item.model";


export class CatalogGASRepository implements CatalogRepositoryInterface {

    private googleAppScriptApi = inject(GoogleAppScriptAPI);

    getCatalogs(): Promise<CatalogRecord[]> {
        this.googleAppScriptApi.getCatalogs();
        throw new Error("Method not implemented.");
    }
    
    
    getCatalogItem(id: string): Promise<unknown> {
        throw new Error("Method not implemented.");
    }

}