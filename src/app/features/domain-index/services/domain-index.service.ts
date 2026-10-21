import { Injectable, inject } from "@angular/core";
import { AppDbService } from "../../../core/services/storage/app-db.service";
import { IndexTopicRecord } from '../model/index-view-row';
import { DomainSheet } from "../../catalog-detail/models/domain-sheet.model";
import { DomainFeatureHandler } from "../../../shared/interfaces/domain-feature-handler.service";
import { TaxonomyService } from "../../../core/services/taxonomy/taxonomy.service";
import { serializeTags } from '../../../shared/utils/tag-utils';

@Injectable({
    providedIn: 'root',
})
export class DomainIndexService implements DomainFeatureHandler<IndexTopicRecord> {

    private readonly dbService = inject(AppDbService);
    private readonly taxonomyService = inject(TaxonomyService);
    readonly name = 'INDEX';

    async loadLocalSheet(row: number): Promise<DomainSheet | null> {
        const records = await this.dbService.db.indexTopics
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
     * Because of the generic signature, TypeScript now knows that syncedRows contains IndexTopic fields!
     */
    async syncRemoteRows(row: number, syncedRows: (IndexTopicRecord & Record<string, unknown>)[]): Promise<void> {
        const table = this.dbService.db.indexTopics;

        await this.dbService.db.transaction('rw', table, async () => {
            await table.where('row').equals(row).delete();

            // Explicit type assignment to IndexTopic[] satisfies the generic constraint completely
            const persistedRows: IndexTopicRecord[] = syncedRows.map((sourceRow, index) => {
                const tags = serializeTags(sourceRow['tags']);

                return {
                    ...sourceRow,
                    id: String(sourceRow['id'] ?? `index_${row}_${index}`),
                    row,
                    tags,
                    syncStatus: 'synced' as const,
                };
            });

            await table.bulkPut(persistedRows);
        });

        // 2. 🌟 POST-PERSISTENCE TRIGGER: Tell TaxonomyService to index the fresh data matrix
        await this.taxonomyService.refreshGlobalTaxonomy(row);
    }


    validateAndSanitizeTags(incomingTags: string[]): string[] {
        return this.taxonomyService.filterAllowedTags(incomingTags);
    }

}