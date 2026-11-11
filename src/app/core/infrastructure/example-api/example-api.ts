
import { CatalogRecord } from "../../../features/domain-1/catalog/models/catalog-item.model";
import { CatalogResponse, PaginatedResponse } from "../../../features/domain-1/shared/model/domain-shared-model";
import { CatalogRepositoryInterface } from "../catalog-repository-interface";

/**
 * Indexed implementation of all operations 
 */
export class ExampleApi implements CatalogRepositoryInterface {
    cloneCatalog(sheetUrl: string): Promise<CatalogResponse<unknown>> {
        throw new Error("Method not implemented.");
    }
    
    
    async getHealth(): Promise<string> {
        throw new Error("Method not implemented.");
    }


    async getCatalogs(page: number, pageSize: number): Promise<CatalogResponse<PaginatedResponse<CatalogRecord>>> {
        throw new Error("Method not implemented.");
    }


    async createItem(item: CatalogRecord): Promise<CatalogResponse<CatalogRecord>> {
        throw new Error("Method not implemented.");
    }


    async updateItem(item: CatalogRecord): Promise<CatalogResponse<CatalogRecord>> {
        throw new Error("Method not implemented.");
    }


    async deleteItem(catalogItemId: string): Promise<CatalogResponse<string>> {
        throw new Error("Method not implemented.");
    }


    async getCatalogItem(id: string): Promise<CatalogResponse<CatalogRecord>> {
        throw new Error("Method not implemented.");
    }

}