import { DomainSheet } from "../../features/catalog-detail/models/domain-sheet.model";


export interface DomainFeatureHandler<T = unknown> {

    readonly name: string;

    loadLocalSheet(row: number): Promise<DomainSheet | null>;

    /**
     * Persists incoming remote updates into the local database table.
     * We expect an array of objects that match your entity type T mixed with any dictionary fields.
     */
    syncRemoteRows(row: number, syncedRows: (T & Record<string, unknown>)[]): Promise<void>;
}