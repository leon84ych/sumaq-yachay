
import { Response, PaginatedResponse } from "../../features/domain-1/shared/model/domain-shared-model";

export interface CatalogRepositoryInterface<TRow> {

    /**
     * Get the health status of the catalog service
     */
    getHealth(): Promise<string>;

    /**
     * Get the list of catalogs avaiable
     */
    getCatalogs(page: number, pageSize: number): Promise<Response<PaginatedResponse<TRow>>>;


    createItem(item: TRow): Promise<Response<TRow>>;


    updateItem(item: TRow): Promise<Response<TRow>>;


    deleteItem(item: TRow): Promise<Response<string>>;


    /**
     * Clone a whole catalog from a public sheet into the user's catalog
     */
    cloneCatalog(sheetUrl: string): Promise<Response<unknown>>;


}