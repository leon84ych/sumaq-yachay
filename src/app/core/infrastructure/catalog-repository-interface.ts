import { CatalogRecord } from "../../features/domain-2/catalog-1/models/catalog-item.model";

export interface CatalogRepositoryInterface {
    
    /**
     * Get the list of catalogs avaiable
     */
    getCatalogs(): Promise<CatalogRecord[]>;


    /**
     * Get the specific catalog item by its ID
     * @param id 
     */
    getCatalogItem(id: string): Promise<unknown>;


}