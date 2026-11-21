import { DomainRepositoryInterface } from "../domain-repository-intreface";
import { Injectable } from "@angular/core";
import { GASDomainAPI, PAGE_SIZE } from "./gas-domain-api.service";
import { GASPaginatedResponseRaw } from "./gas-model.model";
import { GASMapperInterface } from "./gas-mapper-interface";
import { Domain } from "../../../features/domain-1/shared/model/domain-shared-model";


@Injectable({
    providedIn: 'root',
})
export abstract class GASDomainRepositoryAbstract<TRecord extends Domain, TRaw, TRowValues> implements DomainRepositoryInterface<TRaw, TRecord>  {


    abstract api: GASDomainAPI<TRaw, TRowValues>;

    abstract domain: string;

    abstract mapper: GASMapperInterface<TRecord, TRaw, TRowValues>;

    abstract rowValueKeys: readonly (keyof TRaw)[];

    /**
     * Retrieves the domain items in a paginated manner until the total number of items is reached.
     * @param row The row number to start fetching from.
     * @param total The total number of items to retrieve (optional). If not provided, all items will be fetched.
     * @returns A promise that resolves to an array of domain items.
     */
    async getDomain(row: number, total: number | null = null): Promise<TRaw[]> {
        const domain: TRaw[] = [];
        const totalPages = total ? Math.ceil(total / PAGE_SIZE) : Infinity;
        for (let page = 1; page <= totalPages; page++) {
            const response = await this.getDomainPaginated(row, page, PAGE_SIZE);
            domain.push(...response.rows);
            if (response.rows.length === 0) break;
        }
        return domain;
    }

    async getDomainPaginated(row: number, page: number, pageSize: number|null): Promise<GASPaginatedResponseRaw<TRaw>> {
        const response = await this.api.getDomainPaginated(row, this.domain, page, pageSize);
        if (!response.data || !Array.isArray(response.data.rows)) {
            throw new Error(
                `Malformed paginated response for ${this.domain} page ${page}: expected a rows array.`,
            );
        }
        return response.data;
    }

    async addDomainItem(record: TRecord): Promise<TRecord> {
        const rowValues = this.mapper.toRowValues(record) as readonly unknown[];
        if (rowValues.length !== this.rowValueKeys.length) {
            throw new Error(`The ${this.domain} row mapper returned an unexpected number of values.`);
        }

        const rowData = Object.fromEntries(
            this.rowValueKeys.map((key, index) => [key, rowValues[index]]),
        );
        const createdRowId = await this.api.addDomainItem(
            record.row,
            record.bookId,
            this.domain,
            rowData,
        );
        const rawRecord = {
            ...this.mapper.toRaw(record),
            id: createdRowId,
            syncStatus: 'synced',
        } as TRaw;

        return this.mapper.toRecord(rawRecord);
    }

    updateDomainItem(id: string): Promise<TRaw> {
        throw new Error("Method not implemented.");
    }

    deleteDomainItem(id: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

}