
/**
 * Different backend implementations for domain items
 */
export interface DomainRepositoryInterface<T> {

    /**
     * Get the list of domain items avaiable
     */
    getDomain(): Promise<T[]>;

    /**
     * Get the domain items paginated
     * @param page 
     * @param pageSize 
     */
    getDomainPaginated(page: number, pageSize: number): Promise<T[]>;

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


}