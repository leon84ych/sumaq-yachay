import { inject, Injectable } from "@angular/core";
import { CatalogRepositoryInterface } from "../../../core/infrastructure/catalog-repository-interface";
import { GASCatalogAPI } from "../../../core/infrastructure/gas/gas-catalog-api.service";
import { mapRole, mapStatus, parseResponseRole, parseResponseStatus, parseSyncStatus } from "../../../core/infrastructure/gas/gas-mapper.mapper";

import { Response, PaginatedResponse } from "../../domain-1/shared/model/domain-shared-model";

import { CatalogRaw, CatalogRawValues, CatalogRecord } from "../models/catalog-item.model";
import { BookInfo } from "../../domain-1/catalog-detail/models/domain-sheet.model";
import { CatalogGASMapper } from "../models/catalog-gas.mapper";



@Injectable({
    providedIn: 'root',
})
export class CatalogGASRepository implements CatalogRepositoryInterface<CatalogRecord> {

    //convertir en clase abstracta para obligar el contrato contra las interfaces 
    private api = inject(GASCatalogAPI<CatalogRaw, CatalogRawValues>);
    private mapper = inject(CatalogGASMapper);

    async getHealth(): Promise<string> {
        try {
            return await this.api.getHealth();
        } catch (error) {
            console.error('Failed to get health:', error);
            throw error;
        }
    }

    async getCatalogs(page: number, pageSize: number): Promise<Response<PaginatedResponse<CatalogRecord>>> {
        try {
            const catalogResponseRow = await this.api.getCatalog(page, pageSize);

            const data = catalogResponseRow.data.rows.map((row: CatalogRaw) => this.mapper.toRecord(row));

            const response: Response<PaginatedResponse<CatalogRecord>> = {
                ...catalogResponseRow,
                status: mapStatus(catalogResponseRow.status),
                role: mapRole(catalogResponseRow.role),
                data: {
                    ...catalogResponseRow.data,
                    rows: data,
                    domain: catalogResponseRow.data.sheetName
                },
            };
            return response;

        } catch (error) {
            console.error('Failed to load catalogs:', error);
            throw error;
        }
    }

    async createItem(item: CatalogRecord): Promise<Response<CatalogRecord>> {
        try {
            const createResponse = await this.api.saveCatalogItem(item.id,item.row, this.mapper.toRaw(item));

            const response: Response<CatalogRecord> = {
                ...createResponse,
                status: mapStatus(createResponse.status),
                role: mapRole(createResponse.role),
                data: this.mapper.toRecord(createResponse.data),
            };
            return response;
        } catch (error) {
            console.error('Failed to save catalog item:', error);
            throw error;
        }

    }


    async updateItem(item: CatalogRecord): Promise<Response<CatalogRecord>> {
        return this.createItem(item);
    }

    async cloneCatalog(sheetUrl: string): Promise<Response<unknown>> {
        try {
            const cloneResponse = await this.api.cloneCatalog(sheetUrl);

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

    async cloneCatalogItem(sheetUrl: string): Promise<Response<CatalogRecord>> {
        try {
            const cloneResponse = await this.api.cloneCatalogItem(sheetUrl);

            const response: Response<CatalogRecord> = {
                ...cloneResponse,
                status: mapStatus(cloneResponse.status),
                role: mapRole(cloneResponse.role),
                data: this.mapper.toRecord(cloneResponse.data),
            };
            return response;
        } catch (error) {
            console.error('Failed to clone catalog item:', error);
            throw error;
        }
    }

    async deleteItem(item: CatalogRecord): Promise<Response<string>> {
        try {
            const deleteResponse = await this.api.deleteCatalogItem(item.row, item.id);

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


    /**
     * Retrieves the book info for the specified row.
     * @param row The row number of the book info to retrieve
     * @returns A promise that resolves to the book info response containing the book info data for the specified row
     */
    async getSource(row: number): Promise<Response<BookInfo>> {

        const bookInfoResponse = await this.api.getBookInfo(row);

        const bookInfo: Response<BookInfo> = {
            ...bookInfoResponse,
            status: parseResponseStatus(bookInfoResponse.status),
            role: parseResponseRole(bookInfoResponse.role),
            data: {
                id: this.mapper.toRecord(bookInfoResponse.data.id),
                domains: bookInfoResponse.data.sheets
            }
        }
        return bookInfo;
    }

   
}

