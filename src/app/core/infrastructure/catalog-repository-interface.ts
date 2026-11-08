
import { CatalogRecord } from "../../features/domain-1/catalog/models/catalog-item.model";
import { CatalogResponse } from "../../features/domain-1/shared/model/domain-shared-model";

export interface CatalogRepositoryInterface {
    
    /**
     * Get the list of catalogs avaiable
     */
    getCatalogs(page: number, pageSize: number): Promise<CatalogResponse<CatalogRecord>>;


    createItem(item : CatalogRecord):CatalogResponse<CatalogRecord>;


    updateItem(item: CatalogRecord):CatalogResponse<CatalogRecord>;


    deleteItem(catalogItemId:string):CatalogResponse<string>;


}