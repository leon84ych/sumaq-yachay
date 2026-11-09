import { inject, Injectable } from "@angular/core";
import { CatalogRepositoryInterface } from "../catalog-repository-interface";
import { GoogleAppScriptAPI } from "./google-app-script-api.service";
import { getCatalogRecord } from "./gas-mapper.mapper";

import { CatalogResponse, PaginatedResponse, Role, Status } from "../../../features/domain-1/shared/model/domain-shared-model";
import { CatalogRow } from "./gas-model.model";
import { CatalogRecord } from "../../../features/domain-1/catalog/models/catalog-item.model";



@Injectable({
  providedIn: 'root',
})
export class CatalogGASRepository implements CatalogRepositoryInterface {

    private googleAppScriptApi = inject(GoogleAppScriptAPI);

    async getCatalogs(page: number, pageSize: number): Promise<CatalogResponse<PaginatedResponse<CatalogRecord>>> {
        try {
            const catalogResponseRow = await this.googleAppScriptApi.getCatalog(page, pageSize);

            const data = catalogResponseRow.data.rows.map((row: CatalogRow) => getCatalogRecord(row));

            const response: CatalogResponse<PaginatedResponse<CatalogRecord>> = {
                ...catalogResponseRow,
                status: mapStatus(catalogResponseRow.status),
                role: mapRole(catalogResponseRow.role),
                data: {
                    ...catalogResponseRow.data,
                    rows: data,
                },
            };
            return response;

        } catch (error) {
            console.error('Failed to load catalogs:', error);
            throw error;
        }
    }

    createItem(item: CatalogRecord): CatalogResponse<CatalogRecord> {
        throw new Error("Method not implemented.");
    }


    updateItem(item: CatalogRecord): CatalogResponse<CatalogRecord> {
        throw new Error("Method not implemented.");
    }


    deleteItem(catalogItemId: string): CatalogResponse<string> {
        throw new Error("Method not implemented.");
    }

    getCatalogItem(id: string): Promise<unknown> {
        throw new Error("Method not implemented.");
    }

}

function mapStatus(status: string): Status {
    if (status === Status.SUCCESS || status === Status.ERROR) {
        return status;
    }
    throw new Error(`Unexpected catalog response status: ${status}`);
}

function mapRole(role: string): Role {
    if (role === Role.ADMIN || role === Role.USER || role === Role.GUEST) {
        return role;
    }
    throw new Error(`Unexpected catalog response role: ${role}`);
}