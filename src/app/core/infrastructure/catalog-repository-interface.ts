
import { CatalogRecord } from "../../features/catalog/models/catalog-item.model";
import { Response, PaginatedResponse } from "../../features/domain-1/shared/model/domain-shared-model";

export interface CatalogRepositoryInterface<T, R> {

    /**
     * Get the health status of the catalog service
     */
    getHealth(): Promise<string>;

    /**
     * Get the list of catalogs avaiable
     */
    getCatalogs(page: number, pageSize: number): Promise<Response<PaginatedResponse<T>>>;


    createItem(item: T): Promise<Response<T>>;


    updateItem(item: T): Promise<Response<T>>;


    deleteItem(item: T): Promise<Response<string>>;


    /**
     * Clone a whole catalog from a public sheet into the user's catalog
     */
    cloneCatalog(sheetUrl: string): Promise<Response<unknown>>;


    /**
    * Convert the raw server response into a domain record of type T 
    * @param raw the retrieved value from server 
    */
    getRecord(raw: R): T;

    /**
     * Convert the domain record of type T into a raw server-compatible format
     * @param record the domain record to be converted into a raw server-compatible format 
     */
    getRaw(record: T): R;

}