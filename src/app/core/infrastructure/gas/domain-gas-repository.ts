import { DomainRepositoryInterface } from "../domain-repository-intreface";
import { inject, Injectable } from "@angular/core";
import { GASDomainAPI } from "./gas-domain-api.service";
import { GASResponseRaw, SheetNamesRaw } from "./gas-model.model";


@Injectable({
    providedIn: 'root',
})
export class DomainGASRepository<T> implements DomainRepositoryInterface<T> {


    private gasDomainApi = inject(GASDomainAPI);


    getSource(row: number): Promise<GASResponseRaw<SheetNamesRaw>> {
        return this.gasDomainApi.getSheetNames(row);
    }

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