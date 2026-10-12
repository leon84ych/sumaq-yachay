import { inject } from "@angular/core";
import { AppDbService, Passage } from "../../../core/services/storage/app-db.service";
import { DomainSheet } from "../../catalog-detail/models/domain-sheet.model";
import { DomainFeatureHandler } from "../../../shared/interfaces/domain-feature-handler.service";

export class DomainPassagesService implements DomainFeatureHandler<Passage> {

    private readonly dbService = inject(AppDbService);
    readonly name = 'PASSAGES';

    async loadLocalSheet(row: number): Promise<DomainSheet | null> {
        const records = await this.dbService.db.passages
            .where('row')
            .equals(row)
            .toArray();

        if (records.length === 0) {
            return null;
        }

        const cleanRows = records.map(({ row: _catalogRow, ...businessProperties }) => businessProperties);

        return {
            row,
            id: this.name.toLowerCase(),
            name: this.name,
            index: 0,
            rows: cleanRows,
        };
    }


    /**
     * Because of the generic signature, TypeScript now knows that syncedRows contains Passage fields!
     */
    async syncRemoteRows(row: number, syncedRows: (Passage & Record<string, unknown>)[]): Promise<void> {
        const table = this.dbService.db.passages;

        await this.dbService.db.transaction('rw', table, async () => {
            await table.where('row').equals(row).delete();

            // Explicit type assignment to Passage[] satisfies the generic constraint completely
            const persistedRows: Passage[] = syncedRows.map((sourceRow, index) => ({
                ...sourceRow,
                id: String(sourceRow['id'] ?? `passages_${row}_${index}`),
                row,
                tag: String(sourceRow['tag'] ?? sourceRow['tags'] ?? `passages_${index}`),
                syncStatus: 'synced' as const,
            }));

            await table.bulkPut(persistedRows);
        });
    }

}