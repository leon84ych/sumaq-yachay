import { Injectable, inject } from "@angular/core";
import { AppDbService, Place } from "../../../core/services/storage/app-db.service";
import { DomainSheet } from "../../catalog-detail/models/domain-sheet.model";
import { DomainFeatureHandler } from "../../../shared/interfaces/domain-feature-handler.service";
import { TaxonomyService } from "../../../core/services/taxonomy/taxonomy.service";
@Injectable({
    providedIn: 'root',
})
export class DomainPlacesService implements DomainFeatureHandler<Place> {

    private readonly dbService = inject(AppDbService);
    readonly name = 'PLACES';
    private readonly taxonomyService = inject(TaxonomyService);

    async loadLocalSheet(row: number): Promise<DomainSheet | null> {
        const records = await this.dbService.db.places
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
     * Because of the generic signature, TypeScript now knows that syncedRows contains Place fields!
     */
    async syncRemoteRows(row: number, syncedRows: (Place & Record<string, unknown>)[]): Promise<void> {
        const table = this.dbService.db.places;

        await this.dbService.db.transaction('rw', table, async () => {
            await table.where('row').equals(row).delete();

            // Explicit type assignment to Place[] satisfies the generic constraint completely
            const persistedRows: Place[] = syncedRows.map((sourceRow, index) => {
                // 1. Extract the raw incoming tags handling key variance safely
                const rawTagsString = String(sourceRow['tag'] ?? sourceRow['tags'] ?? '');
                const parsedTags = rawTagsString.split(/[\s,;]+/).filter(Boolean);

                // 2. Validate and filter tags using the live INDEX domain whitelist via the service helper
                const authorizedTags = this.validateAndSanitizeTags(parsedTags);
                const sanitizedTagsString = authorizedTags.join(' ');

                return {
                    ...sourceRow,
                    id: String(sourceRow['id'] ?? `places_${row}_${index}`),
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