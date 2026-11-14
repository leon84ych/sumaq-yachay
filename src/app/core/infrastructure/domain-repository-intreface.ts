import { PaginatedResponse } from "../../features/domain-1/shared/model/domain-shared-model";

/**
 * Different backend implementations for domain items
 */
export interface DomainRepositoryInterface<T, R> {

    /**
     * Get the list of domain items avaiable
     */
    getDomain(): Promise<T[]>;

    /**
     * Get the domain items paginated
     * @param row The row number of the book info to retrieve
     * @param page The page number to retrieve
     * @param pageSize The number of items per page
     */
    getDomainPaginated(row: number, page: number, pageSize: number): Promise<PaginatedResponse<T>>;


    /**
     * Add a new domain item by its ID
     * @param id 
     */
    addDomainItem(id: string): Promise<T>;


    /**
     * Update the specific domain item by its ID
     * @param id 
     */
    updateDomainItem(id: string): Promise<T>;

    /**
     * Delete the specific domain item by its ID
     * @param id 
     */
    deleteDomainItem(id: string): Promise<void>;


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