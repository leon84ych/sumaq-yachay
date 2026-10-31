import { Injectable, inject } from "@angular/core";
import { AppDbService } from "../../../../core/services/storage/app-db.service";
import { QuestionRecord } from '../model/domain-question-row.model';
import { DomainSheet } from "../../../catalog-detail/models/domain-sheet.model";
import { DomainFeatureHandler } from "../../../../shared/interfaces/domain-feature-handler.service";
import { TaxonomyService } from "../../../../core/services/taxonomy/taxonomy.service";
import { parseTagsFromArray, serializeTagsToArray } from '../../../../shared/utils/tag-utils';

@Injectable({
    providedIn: 'root',
})
export class DomainQuestionsService implements DomainFeatureHandler<QuestionRecord> {

    private readonly dbService = inject(AppDbService);
    private readonly taxonomyService = inject(TaxonomyService);
    readonly name = 'QUESTIONS';

    async loadLocalSheet(row: number): Promise<DomainSheet | null> {
        const records = await this.dbService.db.questions
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
     * Because of the generic signature, TypeScript now knows that syncedRows contains Question fields!
     */
    async syncRemoteRows(row: number, syncedRows: (QuestionRecord & Record<string, unknown>)[]): Promise<void> {
        const table = this.dbService.db.questions;

        await this.dbService.db.transaction('rw', table, async () => {
            // Explicit type assignment to Question[] satisfies the generic constraint completely
            const persistedRows: QuestionRecord[] = syncedRows.map((sourceRow, index) => {
                // 1. Extract the raw incoming tags handling key variance safely
                const parsedTags = parseTagsFromArray(sourceRow['tags']);

                // 2. Validate and filter tags using the live INDEX domain whitelist
                const authorizedTags = this.validateAndSanitizeTags(parsedTags);
                const tags = serializeTagsToArray(authorizedTags);

                return {
                    ...sourceRow,
                    id: String(sourceRow['id'] ?? `questions_${row}_${index}`),
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
