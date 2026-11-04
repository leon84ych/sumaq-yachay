
import { DomainRepositoryInterface } from "../domain-repository-intreface";

/**
 * Indexed implementation of all operations 
 */
export class CataloLocalRepository<T> implements DomainRepositoryInterface<T> {

    getDomain(): Promise<T[]> {
        throw new Error("Method not implemented.");
    }
    
    getDomainPaginated(page: number, pageSize: number): Promise<T[]> {
        throw new Error("Method not implemented.");
    }
    
    addDomainItem(id: string): Promise<T> {
        throw new Error("Method not implemented.");
    }
    
    updateDomainItem(id: string): Promise<T> {
        throw new Error("Method not implemented.");
    }
    
    deleteDomainItem(id: string): Promise<void> {
        throw new Error("Method not implemented.");
    }


}