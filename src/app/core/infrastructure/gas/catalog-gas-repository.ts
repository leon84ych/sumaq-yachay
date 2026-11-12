import { inject, Injectable } from "@angular/core";
import { CatalogRepositoryInterface } from "../catalog-repository-interface";
import { GASCatalogAPI } from "./gas-catalog-api.service";
import { getCatalogRecord } from "./gas-mapper.mapper";

import { CatalogResponse, PaginatedResponse, Role, Status } from "../../../features/domain-1/shared/model/domain-shared-model";
import { CatalogRaw } from "./gas-model.model";
import { CatalogRecord } from "../../../features/domain-1/catalog/models/catalog-item.model";



@Injectable({
    providedIn: 'root',
})
export class CatalogGASRepository implements CatalogRepositoryInterface {

    private gasCatalogApi = inject(GASCatalogAPI);

    async getHealth(): Promise<string> {
        try {
            return await this.gasCatalogApi.getHealth();
        } catch (error) {
            console.error('Failed to get health:', error);
            throw error;
        }
    }

    async getCatalogs(page: number, pageSize: number): Promise<CatalogResponse<PaginatedResponse<CatalogRecord>>> {
        try {
            const catalogResponseRow = await this.gasCatalogApi.getCatalog(page, pageSize);

            const data = catalogResponseRow.data.rows.map((row: CatalogRaw) => getCatalogRecord(row));

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

    async createItem(item: CatalogRecord): Promise<CatalogResponse<CatalogRecord>> {
        try {
            const createResponse = await this.gasCatalogApi.saveCatalogItem(item);

            const response: CatalogResponse<CatalogRecord> = {
                ...createResponse,
                status: mapStatus(createResponse.status),
                role: mapRole(createResponse.role),
                data: getCatalogRecord(createResponse.data),
            };
            return response;
        } catch (error) {
            console.error('Failed to save catalog item:', error);
            throw error;
        }

    }


    async updateItem(item: CatalogRecord): Promise<CatalogResponse<CatalogRecord>> {
        return this.createItem(item);
    }

    async cloneCatalog(sheetUrl: string): Promise<CatalogResponse<unknown>> {
        try {
            const cloneResponse = await this.gasCatalogApi.cloneCatalog(sheetUrl);

            return {
                ...cloneResponse,
                status: mapStatus(cloneResponse.status),
                role: mapRole(cloneResponse.role),
            };
        } catch (error) {
            console.error('Failed to clone catalog:', error);
            throw error;
        }
    }

    async cloneCatalogItem(sheetUrl: string): Promise<CatalogResponse<CatalogRecord>> {
        try {
            const cloneResponse = await this.gasCatalogApi.cloneCatalogItem(sheetUrl);

            const response: CatalogResponse<CatalogRecord> = {
                ...cloneResponse,
                status: mapStatus(cloneResponse.status),
                role: mapRole(cloneResponse.role),
                data: getCatalogRecord(cloneResponse.data),
            };
            return response;
        } catch (error) {
            console.error('Failed to clone catalog item:', error);
            throw error;
        }
    }

    async deleteItem(item: CatalogRecord): Promise<CatalogResponse<string>> {
        try {
            const deleteResponse = await this.gasCatalogApi.deleteCatalogItem(item.row, item.id);

            return {
                ...deleteResponse,
                status: mapStatus(deleteResponse.status),
                role: mapRole(deleteResponse.role),
            };
        } catch (error) {
            console.error('Failed to delete catalog item:', error);
            throw error;
        }
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