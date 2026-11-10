
import { CatalogRecord } from "../../features/domain-1/catalog/models/catalog-item.model";
import { CatalogResponse, PaginatedResponse } from "../../features/domain-1/shared/model/domain-shared-model";

export interface CatalogRepositoryInterface {
    
    /**
     * Get the health status of the catalog service
     */
    getHealth(): Promise<string>;
    
    /**
     * Get the list of catalogs avaiable
     */
    getCatalogs(page: number, pageSize: number): Promise<CatalogResponse<PaginatedResponse<CatalogRecord>>>;


    createItem(item : CatalogRecord):CatalogResponse<CatalogRecord>;


    updateItem(item: CatalogRecord):CatalogResponse<CatalogRecord>;


    deleteItem(catalogItemId:string):CatalogResponse<string>;


}