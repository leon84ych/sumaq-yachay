import { inject } from "@angular/core";
import { AppDbService, Question } from "../../../core/services/storage/app-db.service";
import { DomainSheet } from "../../catalog-detail/models/domain-sheet.model";
import { DomainFeatureHandler } from "../../../shared/interfaces/domain-feature-handler.service";

export class DomainQuestionsService implements DomainFeatureHandler<Question> {

    private readonly dbService = inject(AppDbService);
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
    async syncRemoteRows(row: number, syncedRows: (Question & Record<string, unknown>)[]): Promise<void> {
        const table = this.dbService.db.questions;

        await this.dbService.db.transaction('rw', table, async () => {
            await table.where('row').equals(row).delete();

            // Explicit type assignment to Question[] satisfies the generic constraint completely
            const persistedRows: Question[] = syncedRows.map((sourceRow, index) => ({
                ...sourceRow,
                id: String(sourceRow['id'] ?? `questions_${row}_${index}`),
                row,
                tag: String(sourceRow['tag'] ?? sourceRow['tags'] ?? `questions_${index}`),
                syncStatus: 'synced' as const,
            }));

            await table.bulkPut(persistedRows);
        });
    }


}