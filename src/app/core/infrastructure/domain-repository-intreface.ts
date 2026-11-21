import { GASPaginatedResponseRaw } from "./gas/gas-model.model";


/**
 * Different backend implementations for domain items
 */
export interface DomainRepositoryInterface<TRow, TAddRecord = TRow> {

    /**
     * Get the list of domain items avaiable
     */
    getDomain(row:number,  total: number): Promise<TRow[]>;

    /**
     * Get the domain items paginated
     * @param row The row number of the book info to retrieve
     * @param page The page number to retrieve
     * @param pageSize The number of items per page
     */
    getDomainPaginated(row: number, page: number, pageSize: number|null): Promise<GASPaginatedResponseRaw<TRow>>;


    /**
     * Add a new domain item.
     * @param item The domain record to add.
     */
    addDomainItem(item: TAddRecord): Promise<TAddRecord>;


    /**
     * Update the specific domain item by its ID
     * @param id 
     */
    updateDomainItem(id: string): Promise<TRow>;

    /**
     * Delete the specific domain item by its ID
     * @param id 
     */
    deleteDomainItem(id: string): Promise<void>;

}