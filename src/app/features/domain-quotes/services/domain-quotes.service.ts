import { inject } from "@angular/core";
import { AppDbService, Quote } from "../../../core/services/storage/app-db.service";
import { DomainSheet } from "../../catalog-detail/models/domain-sheet.model";
import { DomainFeatureHandler } from "../../../shared/interfaces/domain-feature-handler.service";

export class DomainQuotesService implements DomainFeatureHandler<Quote> {

    private readonly dbService = inject(AppDbService);
    readonly name = 'QUOTES';

    async loadLocalSheet(row: number): Promise<DomainSheet | null> {
        const records = await this.dbService.db.quotes
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
             * Because of the generic signature, TypeScript now knows that syncedRows contains Quote fields!
             */
            async syncRemoteRows(row: number, syncedRows: (Quote & Record<string, unknown>)[]): Promise<void> {
                const table = this.dbService.db.quotes;
        
                await this.dbService.db.transaction('rw', table, async () => {
                    await table.where('row').equals(row).delete();
        
                    // Explicit type assignment to Quote[] satisfies the generic constraint completely
                    const persistedRows: Quote[] = syncedRows.map((sourceRow, index) => ({
                        ...sourceRow,
                        id: String(sourceRow['id'] ?? `quotes_${row}_${index}`),
                        row,
                        tag: String(sourceRow['tag'] ?? sourceRow['tags'] ?? `quotes_${index}`),
                        syncStatus: 'synced' as const,
                    }));
        
                    await table.bulkPut(persistedRows);
                });
            }
        

}