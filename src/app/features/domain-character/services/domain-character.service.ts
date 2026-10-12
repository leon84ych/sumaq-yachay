import { inject } from "@angular/core";
import { AppDbService, Character } from "../../../core/services/storage/app-db.service";
import { DomainSheet } from "../../catalog-detail/models/domain-sheet.model";
import { DomainFeatureHandler } from "../../../shared/interfaces/domain-feature-handler.service";

export class DomainCharacterService implements DomainFeatureHandler<Character> {

    private readonly dbService = inject(AppDbService);
    readonly name = 'CHARACTER';

    async loadLocalSheet(row: number): Promise<DomainSheet | null> {
        const records = await this.dbService.db.characters
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
       * Because of the generic signature, TypeScript now knows that syncedRows contains Character fields!
       */
    async syncRemoteRows(row: number, syncedRows: (Character & Record<string, unknown>)[]): Promise<void> {
        const table = this.dbService.db.characters;

        await this.dbService.db.transaction('rw', table, async () => {
            await table.where('row').equals(row).delete();

            // Explicit type assignment to Character[] satisfies the generic constraint completely
            const persistedRows: Character[] = syncedRows.map((sourceRow, index) => ({
                ...sourceRow,
                id: String(sourceRow['id'] ?? `characters_${row}_${index}`),
                row,
                tag: String(sourceRow['tag'] ?? sourceRow['tags'] ?? `characters_${index}`),
                syncStatus: 'synced' as const,
            }));

            await table.bulkPut(persistedRows);
        });
    }

}