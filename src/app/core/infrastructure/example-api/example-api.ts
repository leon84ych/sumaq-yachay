
import { CatalogRaw, CatalogRecord } from "../../../features/catalog/models/catalog-item.model";
import { Response, PaginatedResponse } from "../../../features/domain-1/shared/model/domain-shared-model";
import { CatalogRepositoryInterface } from "../catalog-repository-interface";

/**
 * Example API implementation of the CatalogRepositoryInterface using CatalogRaw data.
 * Provides methods for CRUD operations and mapping between raw and record formats.
 */
export class ExampleApi implements CatalogRepositoryInterface<CatalogRaw> {



    getCatalogs(page: number, pageSize: number): Promise<Response<PaginatedResponse<CatalogRaw>>> {
        throw new Error("Method not implemented.");
    }
    
    
    createItem(item: CatalogRaw): Promise<Response<CatalogRaw>> {
        throw new Error("Method not implemented.");
    }
    
    
    updateItem(item: CatalogRaw): Promise<Response<CatalogRaw>> {
        throw new Error("Method not implemented.");
    }
    
    
    deleteItem(item: CatalogRaw): Promise<Response<string>> {
        throw new Error("Method not implemented.");
    }


    getRecord(raw: CatalogRaw): CatalogRecord {
        throw new Error("Method not implemented.");
    }


    getRaw(record: CatalogRecord): CatalogRaw {
        throw new Error("Method not implemented.");
    }


    cloneCatalog(sheetUrl: string): Promise<Response<unknown>> {
        throw new Error("Method not implemented.");
    }


    async getHealth(): Promise<string> {
        throw new Error("Method not implemented.");
    }



    async getCatalogItem(id: string): Promise<Response<CatalogRecord>> {
        throw new Error("Method not implemented.");
    }

}