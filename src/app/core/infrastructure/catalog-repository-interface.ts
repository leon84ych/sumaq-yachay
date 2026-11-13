
import { CatalogRecord } from "../../features/catalog/models/catalog-item.model";
import { Response, PaginatedResponse } from "../../features/domain-1/shared/model/domain-shared-model";

export interface CatalogRepositoryInterface {
    
    /**
     * Get the health status of the catalog service
     */
    getHealth(): Promise<string>;
    
    /**
     * Get the list of catalogs avaiable
     */
    getCatalogs(page: number, pageSize: number): Promise<Response<PaginatedResponse<CatalogRecord>>>;


    createItem(item : CatalogRecord): Promise<Response<CatalogRecord>>;


    updateItem(item: CatalogRecord): Promise<Response<CatalogRecord>>;


    deleteItem(item: CatalogRecord): Promise<Response<string>>;


    /**
     * Clone a whole catalog from a public sheet into the user's catalog
     */
    cloneCatalog(sheetUrl: string): Promise<Response<unknown>>;


}