
import { CatalogRecord } from "../../../features/catalog/models/catalog-item.model";
import { Response, PaginatedResponse } from "../../../features/domain-1/shared/model/domain-shared-model";
import { CatalogRepositoryInterface } from "../catalog-repository-interface";

/**
 * Indexed implementation of all operations 
 */
export class ExampleApi implements CatalogRepositoryInterface {
    cloneCatalog(sheetUrl: string): Promise<Response<unknown>> {
        throw new Error("Method not implemented.");
    }
    
    
    async getHealth(): Promise<string> {
        throw new Error("Method not implemented.");
    }


    async getCatalogs(page: number, pageSize: number): Promise<Response<PaginatedResponse<CatalogRecord>>> {
        throw new Error("Method not implemented.");
    }


    async createItem(item: CatalogRecord): Promise<Response<CatalogRecord>> {
        throw new Error("Method not implemented.");
    }


    async updateItem(item: CatalogRecord): Promise<Response<CatalogRecord>> {
        throw new Error("Method not implemented.");
    }


    async deleteItem(item: CatalogRecord): Promise<Response<string>> {
        throw new Error("Method not implemented.");
    }


    async getCatalogItem(id: string): Promise<Response<CatalogRecord>> {
        throw new Error("Method not implemented.");
    }

}