
import { CatalogRecord } from "../../../features/domain-1/catalog/models/catalog-item.model";
import { CatalogResponse, PaginatedResponse } from "../../../features/domain-1/shared/model/domain-shared-model";
import { CatalogRepositoryInterface } from "../catalog-repository-interface";

/**
 * Indexed implementation of all operations 
 */
export class ExampleApi implements CatalogRepositoryInterface {
    
    
    getHealth(): Promise<string> {
        throw new Error("Method not implemented.");
    }


    getCatalogs(page: number, pageSize: number): Promise<CatalogResponse<PaginatedResponse<CatalogRecord>>> {
        throw new Error("Method not implemented.");
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




}