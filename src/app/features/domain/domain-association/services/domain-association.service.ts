import { Injectable, inject } from '@angular/core';
import { AppDbService } from '../../../../core/services/storage/app-db.service';
import { TaxonomyService } from '../../../../core/services/taxonomy/taxonomy.service';
import { DomainSheet } from '../../../catalog-detail/models/domain-sheet.model';
import { DomainFeatureHandler } from '../../../../shared/interfaces/domain-feature-handler.service';
import { parseTags, serializeTags } from '../../../../shared/utils/tag-utils';
import { BookAssociationRecord } from '../model/book-association.model';

@Injectable({ providedIn: 'root' })
export class DomainAssociationService implements DomainFeatureHandler<BookAssociationRecord> {
  private readonly dbService = inject(AppDbService);
  private readonly taxonomyService = inject(TaxonomyService);
  readonly name = 'ASSOCIATIONS';

  async loadLocalSheet(row: number): Promise<DomainSheet> {
    const records = await this.dbService.db.relationsConcepts.where('row').equals(row).toArray();
    const rows = records
      .sort((left, right) => left.displayRow - right.displayRow)
      .map(({ row: _catalogRow, displayRow, ...record }) => ({
        ...record,
        row: displayRow,
        tags: serializeTags(record['tags']),
      }));

    return {
      row,
      id: this.name.toLowerCase(),
      name: this.name,
      index: 0,
      rows,
    };
  }

  async syncRemoteRows(
    row: number,
    syncedRows: (BookAssociationRecord & Record<string, unknown>)[],
  ): Promise<void> {
    const table = this.dbService.db.relationsConcepts;
    await this.dbService.db.transaction('rw', table, async () => {
      await table.where('row').equals(row).delete();

      const records: BookAssociationRecord[] = syncedRows.map((sourceRow, index) => {
        const tags = serializeTags(
          this.validateAndSanitizeTags(parseTags(sourceRow['tags'])),
        );
        const displayRowValue = Number(sourceRow['displayRow'] ?? sourceRow['row']);

        return {
          ...sourceRow,
          id: String(sourceRow['id'] ?? `associations_${row}_${index}`),
          row,
          displayRow: Number.isFinite(displayRowValue) ? displayRowValue : index + 1,
          sourceConceptId: String(sourceRow['sourceConceptId'] ?? ''),
          targetConceptId: String(sourceRow['targetConceptId'] ?? ''),
          relationType: String(sourceRow['relationType'] ?? ''),
          directed: sourceRow['directed'] === true || String(sourceRow['directed']) === 'true',
          description: String(sourceRow['description'] ?? ''),
          color: String(sourceRow['color'] ?? '#735D78'),
          book: String(sourceRow['book'] ?? ''),
          author: String(sourceRow['author'] ?? ''),
          page: String(sourceRow['page'] ?? ''),
          tags,
          feed: Number(sourceRow['feed'] ?? 5),
          contributor: String(sourceRow['contributor'] ?? 'currentUser'),
          syncStatus: 'synced',
        };
      });

      await table.bulkPut(records);
    });
  }

  validateAndSanitizeTags(incomingTags: string[]): string[] {
    return this.taxonomyService.filterAllowedTags(incomingTags);
  }
}
