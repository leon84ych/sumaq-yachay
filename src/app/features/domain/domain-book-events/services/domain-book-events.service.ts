import { Injectable, inject } from '@angular/core';
import { AppDbService } from '../../../../core/services/storage/app-db.service';
import { DomainSheet } from '../../../catalog-detail/models/domain-sheet.model';
import { DomainFeatureHandler } from '../../../../shared/interfaces/domain-feature-handler.service';
import { TaxonomyService } from '../../../../core/services/taxonomy/taxonomy.service';
import { parseTags, serializeTags } from '../../../../shared/utils/tag-utils';
import { BookEventRecord } from '../model/book-event-row.model';

@Injectable({ providedIn: 'root' })
export class DomainBookEventsService implements DomainFeatureHandler<BookEventRecord> {
  private readonly dbService = inject(AppDbService);
  private readonly taxonomyService = inject(TaxonomyService);
  readonly name = 'BOOK_EVENTS';

  async loadLocalSheet(row: number): Promise<DomainSheet> {
    const records = await this.dbService.db.bookEvents.where('row').equals(row).toArray();
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
    syncedRows: (BookEventRecord & Record<string, unknown>)[],
  ): Promise<void> {
    const table = this.dbService.db.bookEvents;
    await this.dbService.db.transaction('rw', table, async () => {
      await table.where('row').equals(row).delete();

      const records: BookEventRecord[] = syncedRows.map((sourceRow, index) => {
        const tags = serializeTags(
          this.validateAndSanitizeTags(parseTags(sourceRow['tags'])),
        );
        const rawSecondaryIds: unknown = sourceRow['secondaryCharacterIds'];
        const secondaryCharacterIds = Array.isArray(rawSecondaryIds)
          ? rawSecondaryIds.map(String)
          : typeof rawSecondaryIds === 'string'
            ? rawSecondaryIds.split(/[\s,;]+/).filter(Boolean)
            : [];
        const eventOrder = Number(sourceRow['eventOrder']);

        return {
          ...sourceRow,
          id: String(sourceRow['id'] ?? `book_events_${row}_${index}`),
          row,
          displayRow: Number(sourceRow['displayRow'] ?? index + 1),
          mainCharacterId: String(sourceRow['mainCharacterId'] ?? ''),
          secondaryCharacterIds,
          placeId: this.optionalString(sourceRow['placeId']),
          dateTimeStart: this.optionalString(sourceRow['dateTimeStart']),
          dateTimeEnd: this.optionalString(sourceRow['dateTimeEnd']),
          dateLabel: this.optionalString(sourceRow['dateLabel']),
          eventOrder: Number.isFinite(eventOrder) ? eventOrder : index + 1,
          event: String(sourceRow['event'] ?? ''),
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

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }
}