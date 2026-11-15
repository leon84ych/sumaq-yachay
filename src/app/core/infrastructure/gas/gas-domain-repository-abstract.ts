import { DomainRepositoryInterface } from "../domain-repository-intreface";
import { Injectable } from "@angular/core";
import { GASDomainAPI } from "./gas-domain-api.service";
import { GASPaginatedResponseRaw } from "./gas-model.model";


@Injectable({
    providedIn: 'root',
})
export abstract class GASDomainRepositoryAbstract<TRaw, TRowValues> implements DomainRepositoryInterface<TRaw>  {


    abstract api: GASDomainAPI<TRaw, TRowValues>;

    abstract domain: string;

    private PAGE_SIZE = 50;

    /**
     * Retrieves the domain items in a paginated manner until the total number of items is reached.
     * @param row The row number to start fetching from.
     * @param total The total number of items to retrieve.
     * @returns A promise that resolves to an array of domain items.
     */
    async getDomain(row: number, total: number): Promise<TRaw[]> {
        
        const domain: TRaw[] = [];
        const totalPages = Math.ceil(total / this.PAGE_SIZE);

        for (let page = 1; page <= totalPages; page++) {
            const response = await this.getDomainPaginated(row, page, this.PAGE_SIZE);
            console.log("ROWS:", response.rows);
            domain.push(...response.rows);

            if (response.rows.length === 0) break;
        }

        return domain;
    }

    async getDomainPaginated(row: number, page: number, pageSize: number): Promise<GASPaginatedResponseRaw<TRaw>> {
        const response = await this.api.getDomainPaginated(row, this.domain, page, pageSize);
        //console.log("Paginated response:", response);
        return {
            ...response.data
        };
    }

    addDomainItem(id: string): Promise<TRaw> {
        throw new Error("Method not implemented.");
    }

    updateDomainItem(id: string): Promise<TRaw> {
        throw new Error("Method not implemented.");
    }

    deleteDomainItem(id: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

}