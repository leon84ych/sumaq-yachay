import { DomainRepositoryInterface } from "../domain-repository-intreface";
import { inject, Injectable } from "@angular/core";
import { GASDomainAPI } from "./gas-domain-api.service";
import { PaginatedResponse } from "../../../features/domain-1/shared/model/domain-shared-model";


@Injectable({
    providedIn: 'root',
})
export abstract class DomainGASRepository<T, R> implements DomainRepositoryInterface<T, R> {


    private gasDomainApi = inject(GASDomainAPI);

    //Define the domain for this repository
    abstract domain: string;


    getDomain(): Promise<T[]> {
        throw new Error("Method not implemented.");
    }

    async getDomainPaginated(row: number, page: number, pageSize: number): Promise<PaginatedResponse<T>> {


        const response = await this.gasDomainApi.getDomainPaginated(row, this.domain, page, pageSize);
        return {
            ...response,
            domain: response.sheetName
        };
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

    /**
     * Convert the raw server response into a domain record of type T 
     * @param raw the retrieved value from server 
     */
    abstract getRecord(raw: R): T;

    /**
     * Convert the domain record of type T into a raw server-compatible format
     * @param record the domain record to be converted into a raw server-compatible format 
     */
    abstract getRaw(record: T): R;

}