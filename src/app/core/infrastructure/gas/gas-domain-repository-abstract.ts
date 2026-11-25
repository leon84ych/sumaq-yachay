import { DomainRepositoryInterface } from "../domain-repository-intreface";
import { Injectable } from "@angular/core";
import { GASDomainAPI, PAGE_SIZE } from "./gas-domain-api.service";
import { GASPaginatedResponseRaw } from "./gas-model.model";
import { GASMapperInterface } from "./gas-mapper-interface";
import { Domain } from "../../../features/domain/shared/model/domain-shared-model";


@Injectable({
    providedIn: 'root',
})
export abstract class GASDomainRepositoryAbstract<
    TRecord extends Domain,
    TRaw,
    TRowValues,
> implements DomainRepositoryInterface<TRaw, TRecord> {

    abstract api: GASDomainAPI<TRaw, TRowValues>;
    abstract domain: string;
    abstract mapper: GASMapperInterface<TRecord, TRaw, TRowValues>;

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

    async getDomainPaginated(row: number, page: number, pageSize: number | null): Promise<GASPaginatedResponseRaw<TRaw>> {
        const response = await this.api.getDomainPaginated(row, this.domain, page, pageSize);
        if (!response.data || !Array.isArray(response.data.rows)) {
            throw new Error(
                `Malformed paginated response for ${this.domain} page ${page}: expected a rows array.`,
            );
        }
        return response.data;
    }

    async addDomainItem(record: TRecord): Promise<TRecord> {
        const rowData = this.mapper.toRaw(record) as Record<string, unknown>;
        const createdRowId = await this.api.addDomainItem(
            record.bookRow,
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

    async updateDomainItem(record: TRecord): Promise<TRecord> {
        const rowData = this.mapper.toRaw(record) as unknown as Record<string, unknown>;
        await this.api.updateDomainItem(record.bookRow, record.bookId, this.domain, record.id, rowData);
        return this.mapper.toRecord({
            ...this.mapper.toRaw(record),
            syncStatus: 'synced',
        });
    }

    deleteDomainItem(record: TRecord): Promise<void> {
        return this.api.deleteDomainItem(record.bookRow, record.bookId, this.domain, record.id, record.itemRow);
    }

}