import { Injectable, inject } from '@angular/core';
import { AppDbService } from '../../../../core/services/storage/app-db.service';
import { TaxonomyService } from '../../../../core/services/taxonomy/taxonomy.service';
import { DomainSheet } from '../../../catalog-detail/models/domain-sheet.model';
import { DomainFeatureHandler } from '../../../../shared/interfaces/domain-feature-handler.service';
import { parseTagsFromArray, serializeTagsToArray } from '../../../../shared/utils/tag-utils';
import { BookRelationRecord } from '../model/book-relation.model';

@Injectable({ providedIn: 'root' })
export class DomainRelationsService implements DomainFeatureHandler<BookRelationRecord> {
  private readonly dbService = inject(AppDbService);
  private readonly taxonomyService = inject(TaxonomyService);
  readonly name = 'RELATIONS';

  async loadLocalSheet(row: number): Promise<DomainSheet> {
    const records = await this.dbService.db.relationsCharacters.where('row').equals(row).toArray();
    const rows = records
      .sort((left, right) => left.displayRow - right.displayRow)
      .map(({ row: _catalogRow, displayRow, ...record }) => ({
        ...record,
        row: displayRow,
        tags: serializeTagsToArray(record['tags']),
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
    syncedRows: (BookRelationRecord & Record<string, unknown>)[],
  ): Promise<void> {
    const table = this.dbService.db.relationsCharacters;
    await this.dbService.db.transaction('rw', table, async () => {
      const records: BookRelationRecord[] = syncedRows.map((sourceRow, index) => {
        const tags = serializeTagsToArray(
          this.validateAndSanitizeTags(parseTagsFromArray(sourceRow['tags'])),
        );
        const displayRowValue = Number(sourceRow['displayRow'] ?? sourceRow['row']);
        const relationType = String(sourceRow['relationType'] ?? '');

        return {
          ...sourceRow,
          id: String(sourceRow['id'] ?? `relations_${row}_${index}`),
          row,
          displayRow: Number.isFinite(displayRowValue) ? displayRowValue : index + 1,
          sourceCharacterId: String(sourceRow['sourceCharacterId'] ?? ''),
          targetCharacterId: String(sourceRow['targetCharacterId'] ?? ''),
          relationType,
          directed: sourceRow['directed'] === true || String(sourceRow['directed']) === 'true',
          description: String(sourceRow['description'] ?? ''),
          color: String(sourceRow['color'] ?? '#D4A373'),
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
