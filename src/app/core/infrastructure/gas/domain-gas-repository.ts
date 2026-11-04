import { DomainRepositoryInterface } from "../domain-repository-intreface";


export class DomainGASRepository<T> implements DomainRepositoryInterface<T> {

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