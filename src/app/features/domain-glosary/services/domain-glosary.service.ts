import { Injectable, inject } from "@angular/core";
import { AppDbService, GlossaryEntry } from "../../../core/services/storage/app-db.service";
import { DomainSheet } from "../../catalog-detail/models/domain-sheet.model";
import { DomainFeatureHandler } from "../../../shared/interfaces/domain-feature-handler.service";
import { TaxonomyService } from "../../../core/services/taxonomy/taxonomy.service";

@Injectable({
    providedIn: 'root',
})
export class DomainGlosaryService implements DomainFeatureHandler<GlossaryEntry> {

    private readonly dbService = inject(AppDbService);
    private readonly taxonomyService = inject(TaxonomyService);
    readonly name = 'GLOSARY';

    async loadLocalSheet(row: number): Promise<DomainSheet | null> {
        const records = await this.dbService.db.glosary
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
     * Because of the generic signature, TypeScript now knows that syncedRows contains GlossaryEntry fields!
     */
    async syncRemoteRows(row: number, syncedRows: (GlossaryEntry & Record<string, unknown>)[]): Promise<void> {
        const table = this.dbService.db.glosary;

        await this.dbService.db.transaction('rw', table, async () => {
            await table.where('row').equals(row).delete();

            // Explicit type assignment to GlossaryEntry[] satisfies the generic constraint completely
            const persistedRows: GlossaryEntry[] = syncedRows.map((sourceRow, index) => {
                // 1. Extract the raw incoming tags handling key variance safely
                const rawTagsString = String(sourceRow['tag'] ?? sourceRow['tags'] ?? '');
                const parsedTags = rawTagsString.split(/[\s,;]+/).filter(Boolean);

                // 2. Validate and filter tags using the live INDEX domain whitelist via the service helper
                const authorizedTags = this.validateAndSanitizeTags(parsedTags);
                const sanitizedTagsString = authorizedTags.join(' ');

                return {
                    ...sourceRow,
                    id: String(sourceRow['id'] ?? `glosary_${row}_${index}`),
                    row,
                    // 3. Assign sanitized tag strings directly into the entity mapping pipeline
                    tag: sanitizedTagsString,
                    tags: sanitizedTagsString,
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