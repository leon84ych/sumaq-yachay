import { Injectable, inject } from "@angular/core";
import { AppDbService } from "../../../../core/services/storage/app-db.service";
import { CharacterRecord } from '../models/domain-character-row.model';
import { DomainSheet } from "../../../catalog-detail/models/domain-sheet.model";
import { DomainFeatureHandler } from "../../../../shared/interfaces/domain-feature-handler.service";
import { TaxonomyService } from "../../../../core/services/taxonomy/taxonomy.service";
import { parseTags, serializeTags } from '../../../../shared/utils/tag-utils';

@Injectable({
  providedIn: 'root',
})
export class DomainCharacterService implements DomainFeatureHandler<CharacterRecord> {

    private readonly dbService = inject(AppDbService);

    private readonly taxonomyService = inject(TaxonomyService);

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
    async syncRemoteRows(row: number, syncedRows: (CharacterRecord & Record<string, unknown>)[]): Promise<void> {
        const table = this.dbService.db.characters;

        await this.dbService.db.transaction('rw', table, async () => {
            await table.where('row').equals(row).delete();

            // Explicit type assignment to Character[] satisfies the generic constraint completely
            const persistedRows: CharacterRecord[] = syncedRows.map((sourceRow, index) => {
                // 1. Extract the raw incoming tags handling key variance safely
                const parsedTags = parseTags(sourceRow['tags']);

                // 2. Validate and filter tags using the live INDEX domain whitelist via the service helper
                const authorizedTags = this.validateAndSanitizeTags(parsedTags);
                const tags = serializeTags(authorizedTags);

                return {
                    ...sourceRow,
                    id: String(sourceRow['id'] ?? `characters_${row}_${index}`),
                    row,
                    tags,
                    syncStatus: 'synced' as const,
                };
            });

            await table.bulkPut(persistedRows);
        });
    }


    validateAndSanitizeTags(incomingTags: string[]): string[] {
        return this.taxonomyService.filterAllowedTags(incomingTags);
    }

}