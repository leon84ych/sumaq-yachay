import { Injectable, computed, inject, signal } from '@angular/core';
import { Table } from 'dexie';
import { firstValueFrom } from 'rxjs';
import { AppDbService, BookTag } from '../../../core/services/storage/app-db.service';
import { DomainDataApiService } from './domain-data-api.service';
import { DomainSheet } from '../models/domain-sheet.model';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';
import { GlobalLoadingService } from '../../../core/services/global-loading.service';
import { ConfigService } from '../../../core/services/config.service';
import { DomainCharacterService } from '../../domain/domain-character/services/domain-character.service';
import { DomainConceptsService } from '../../domain/domain-concepts/services/domain-concepts.service';
import { DomainQuotesService } from '../../domain/domain-quotes/services/domain-quotes.service';
import { DomainPassagesService } from '../../domain/domain-passages/services/domain-passages.service';
import { DomainPlacesService } from '../../domain/domain-places/services/domain-places.service';
import { DomainGlosaryService } from '../../domain/domain-glosary/services/domain-glosary.service';
import { DomainQuestionsService } from '../../domain/domain-questions/services/domain-questions.service';
import { DomainFeatureHandler } from '../../../shared/interfaces/domain-feature-handler.service';
import { DomainIndexService } from '../../domain/domain-index/services/domain-index.service';
import { DomainBookEventsService } from '../../domain/domain-book-events/services/domain-book-events.service';
import { DomainRelationsService } from '../../domain/domain-relations/services/domain-relations.service';
import { DomainAssociationService } from '../../domain/domain-association/services/domain-association.service';
import { sortDomainTabs } from '../models/domain-sheet-config';
import { TaxonomyService } from '../../../core/services/taxonomy/taxonomy.service';
import { PermissionService } from '../../../core/services/permission.service';
import { normalizeTagsFromArray, parseTagsFromArray, deserializeTagsFromBE, serializeTagsToArray, serializeTagsToString, serializeTagsToBE } from '../../../shared/utils/tag-utils';

type DomainTableName =
  | 'indexTopics'
  | 'concepts'
  | 'quotes'
  | 'passages'
  | 'characters'
  | 'places'
  | 'bookEvents'
  | 'relationsCharacters'
  | 'relationsConcepts'
  | 'glosary'
  | 'questions';

interface SheetPaginationState {
  page: number;
  totalPages: number | null;
  isLoading: boolean;
  error: string | null;
}

export interface BookTagContext {
  row: number;
  book?: string;
  author?: string;
  subject?: string;
  topic?: string;
  domain?: string;
}

const DOMAIN_PAGE_SIZE = 50;

interface PersistedDomainRow extends Record<string, unknown> {
  id: string;
  row: number;
  tags: string[];
  syncStatus: 'pending' | 'synced' | 'error';
}

const DOMAIN_TABLES: Record<string, DomainTableName> = {
  INDEX: 'indexTopics',
  CONCEPTS: 'concepts',
  QUOTES: 'quotes',
  PASSAGES: 'passages',
  CHARACTER: 'characters',
  PLACES: 'places',
  BOOK_EVENTS: 'bookEvents',
  RELATIONS: 'relationsCharacters',
  ASSOCIATIONS: 'relationsConcepts',
  GLOSARY: 'glosary',
  QUESTIONS: 'questions',
};

const DOMAIN_TABLE_NAMES = Object.values(DOMAIN_TABLES) as DomainTableName[];

@Injectable({
  providedIn: 'root',
})
export class DomainDataService {
  private dbService = inject(AppDbService);
  private apiService = inject(DomainDataApiService);
  private authService = inject(GoogleAuthService);
  private globalLoadingService = inject(GlobalLoadingService);
  private configService = inject(ConfigService);
  private permissionService = inject(PermissionService);

  private readonly taxonomyService = inject(TaxonomyService);

  //Each domain services
  private readonly characterService = inject(DomainCharacterService);
  private readonly conceptsService = inject(DomainConceptsService);
  private readonly glosaryService = inject(DomainGlosaryService);
  private readonly indexService = inject(DomainIndexService);
  private readonly passagesService = inject(DomainPassagesService);
  private readonly placesService = inject(DomainPlacesService);
  private readonly bookEventsService = inject(DomainBookEventsService);
  private readonly relationsService = inject(DomainRelationsService);
  private readonly associationService = inject(DomainAssociationService);
  private readonly questionsService = inject(DomainQuestionsService);
  private readonly quotesService = inject(DomainQuotesService);

  private readonly featureHandlers: DomainFeatureHandler<any>[] = [
    this.characterService,
    this.conceptsService,
    this.glosaryService,
    this.indexService,
    this.passagesService,
    this.placesService,
    this.bookEventsService,
    this.relationsService,
    this.associationService,
    this.questionsService,
    this.quotesService,
  ];

  readonly sheets = signal<DomainSheet[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly pagination = signal<Record<string, SheetPaginationState>>({});

  private loadedRow: number | null = null;

  readonly sheetNames = computed(() => this.sheets().filter(sheet => sheet.name != 'ID').map((sheet) => sheet.name));

  extractAndNormalizeTags(tags: string[]): string[] {
    return normalizeTagsFromArray(tags);
  }

  async upsertBookTags(tags: string[], bookContext: BookTagContext): Promise<void> {
    const normalizedTags = this.extractAndNormalizeTags(tags);
    if (normalizedTags.length === 0) {
      return;
    }

    const table = this.dbService.db.bookTags;
    await this.dbService.db.transaction('rw', table, async () => {
      for (const tag of normalizedTags) {
        const id = `${bookContext.row}_${tag}`;
        const existing = await table.get(id);
        await table.put({
          ...existing,
          id,
          scope: 'book',
          row: bookContext.row,
          book: bookContext.book ?? existing?.book ?? String(bookContext.row),
          ...((bookContext.author ?? existing?.author)
            ? { author: bookContext.author ?? existing?.author }
            : {}),
          ...((bookContext.subject ?? existing?.subject)
            ? { subject: bookContext.subject ?? existing?.subject }
            : {}),
          ...((bookContext.topic ?? existing?.topic)
            ? { topic: bookContext.topic ?? existing?.topic }
            : {}),
          ...((bookContext.domain ?? existing?.domain)
            ? { domain: bookContext.domain ?? existing?.domain }
            : {}),
          name: tag,
          usageCount: (existing?.usageCount ?? 0) + 1,
        });
      }
    });
  }

  canLoadMore(sheetName: string): boolean {
    if (
      this.configService.isLocalSampleDataEnabled() ||
      !DOMAIN_TABLES[sheetName.toUpperCase()]
    ) {
      return false;
    }
    const state = this.pagination()[this.paginationKey(sheetName)];
    return !state || state.totalPages === null || state.page < state.totalPages;
  }

  async loadAllRows(sheetName: string): Promise<void> {
    if (this.configService.isLocalSampleDataEnabled()) {
      return;
    }

    const sheet = this.sheets().find((candidate) => candidate.name === sheetName);
    if (!sheet) {
      throw new Error(`The ${sheetName} sheet is not available.`);
    }

    const key = this.paginationKey(sheetName);
    while (this.canLoadMore(sheetName)) {
      const currentSheet = this.sheets().find((candidate) => candidate.name === sheetName);
      if (!currentSheet) {
        throw new Error(`The ${sheetName} sheet is not available.`);
      }

      const previousState = this.pagination()[key];
      const previousPage =
        previousState?.page ?? Math.floor(currentSheet.rows.length / DOMAIN_PAGE_SIZE);
      await this.loadNextPage(sheetName);

      const nextState = this.pagination()[key];
      if (nextState?.error) {
        throw new Error(nextState.error);
      }
      if (this.canLoadMore(sheetName) && (nextState?.page ?? previousPage) <= previousPage) {
        throw new Error(`Could not load all ${sheetName.toLocaleLowerCase()} entries.`);
      }
    }
  }

  /** Adds rows that exist in IndexedDB for the loaded book but are not yet in the sheet state. */
  async mergeLocalRows(sheetName: string): Promise<number> {
    const row = this.loadedRow;
    const handler = this.featureHandlers.find((h) => h.name === sheetName.toUpperCase());
    if (row === null || !handler) {
      return 0;
    }

    const localSheet = await handler.loadLocalSheet(row);
    if (this.loadedRow !== row || !localSheet) {
      return 0;
    }
    const currentSheet = this.sheets().find((candidate) => candidate.name === sheetName);
    if (!currentSheet) {
      return 0;
    }

    const knownIds = new Set(currentSheet.rows.map((item) => String(item['id'])));
    const missing = localSheet.rows.filter((item) => !knownIds.has(String(item['id'])));
    if (missing.length === 0) {
      return 0;
    }

    this.updateLocalSheetRowsState(sheetName, this.mergeRows(currentSheet.rows, missing));
    return missing.length;
  }

  /** Renders any unseen rows already in IndexedDB first; requests the server only if none. */
  async loadMore(sheetName: string): Promise<void> {
    if ((await this.mergeLocalRows(sheetName)) > 0) {
      return;
    }
    await this.loadNextPage(sheetName);
  }

  async loadNextPage(sheetName: string): Promise<void> {
    if (this.configService.isLocalSampleDataEnabled()) {
      return;
    }

    const row = this.loadedRow;
    const sheet = this.sheets().find((candidate) => candidate.name === sheetName);
    if (row === null || !sheet || !this.canLoadMore(sheetName)) {
      return;
    }

    const key = this.paginationKey(sheetName);
    const previousState = this.pagination()[key];
    if (previousState?.isLoading) {
      return;
    }

    const lastLoadedPage = previousState?.page ?? Math.floor(sheet.rows.length / DOMAIN_PAGE_SIZE);
    const nextPage = lastLoadedPage + 1;
    const useGlobalLoading = sheet.rows.length === 0;
    const operation = useGlobalLoading ? this.globalLoadingService.begin() : null;
    this.pagination.update((current) => ({
      ...current,
      [key]: {
        page: lastLoadedPage,
        totalPages: previousState?.totalPages ?? null,
        isLoading: true,
        error: null,
      },
    }));

    try {
      const response = await firstValueFrom(
        this.apiService.getPaginatedRows(row, sheetName, nextPage, DOMAIN_PAGE_SIZE),
      );
      if (!Array.isArray(response?.rows)) {
        throw new Error('Malformed paginated domain response: rows array is missing.');
      }

      const tableName = this.getDomainTableName(sheetName);
      const pageRows = this.mapPaginatedRows(row, sheetName, nextPage, response.rows);
      const persistedRows = this.preparePersistedRows(tableName, row, pageRows);
      const table = this.domainTable(tableName);
      const nextSheets = this.sheets().map((currentSheet) =>
        currentSheet.name === sheetName
          ? { ...currentSheet, rows: this.mergeRows(currentSheet.rows, pageRows) }
          : currentSheet,
      );
      const orderedSheets = sortDomainTabs(nextSheets);
      const bookTags = await this.buildBookTags(row, orderedSheets);
      await this.dbService.db.transaction('rw', [table, this.dbService.db.bookTags], async () => {
        await table.bulkPut(persistedRows);
        await this.replaceBookTagsForCatalog(row, bookTags);
      });
      this.sheets.set(orderedSheets);
      this.pagination.update((current) => ({
        ...current,
        [key]: {
          page: response.page,
          totalPages: response.totalPages,
          isLoading: false,
          error: null,
        },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load more rows.';
      this.pagination.update((current) => ({
        ...current,
        [key]: {
          page: lastLoadedPage,
          totalPages: previousState?.totalPages ?? null,
          isLoading: false,
          error: message,
        },
      }));
    } finally {
      if (operation !== null) {
        this.globalLoadingService.end(operation);
      }
    }
  }

  async loadForCatalog(row: number): Promise<void> {
    this.loadedRow = row;
    this.errorMessage.set(null);
    this.sheets.set([]);
    this.isLoading.set(true);

    try {
      const localSheets = await this.loadFromLocal(row);
      const bookTags = await this.buildBookTags(row, localSheets);
      await this.dbService.db.transaction('rw', [this.dbService.db.bookTags], async () => {
        await this.replaceBookTagsForCatalog(row, bookTags);
      });
      await this.taxonomyService.refreshGlobalTaxonomy(row);

      if (localSheets.length > 0) {
        this.sheets.set(localSheets);
      }

      if (this.configService.isLocalSampleDataEnabled()) {
        this.permissionService.setRole('admin');
        this.isLoading.set(false);
        return;
      }

      if (!this.configService.isLocalSampleDataEnabled()) {
        if (this.authService.idToken()) {
          await this.refreshFromRemote(row);
        } else {
          this.isLoading.set(false);
        }
        return;
      }

      if (!this.authService.idToken()) {
        this.isLoading.set(false);
        return;
      }

      if (localSheets.length === 0) {
        await this.refreshFromRemote(row);
      } else {
        this.isLoading.set(false);
        // Disparar en segundo plano de forma segura sin bloquear la UI
        void this.refreshFromRemote(row, true).catch((err) =>
          console.error('[Local-First] Error en sincronización de fondo:', err),
        );
      }
    } catch (err: unknown) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Unknown local load error.');
      this.isLoading.set(false);
    }
  }

  async createDomainSheet(sheetName: string, headers: string[]): Promise<void> {
    if (!this.loadedRow) {
      throw new Error('No active catalog row selected.');
    }

    const row = this.loadedRow;
    if (this.configService.isLocalSampleDataEnabled()) {
      const name = sheetName.trim();
      const storedSheets = await this.dbService.db.domainSheets.get(row);
      const customSheets = storedSheets?.customSheets ?? [];
      if (
        !name ||
        DOMAIN_TABLES[name.toUpperCase()] ||
        customSheets.some((sheet) => sheet.name === name)
      ) {
        throw new Error(`A local sheet named "${name}" cannot be created.`);
      }

      const index = this.sheets().length;
      const sheet = { row, id: name.toLowerCase(), name, index, rows: [] };
      await this.dbService.db.domainSheets.put({
        row,
        count: index + 1,
        customSheets: [...customSheets, { name, index, headers: [...headers], rows: [] }],
      });
      this.sheets.update((current) => [...current, sheet]);
      return;
    }

    const operation = this.globalLoadingService.begin();
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const response = await firstValueFrom(this.apiService.createSheet(row, sheetName, headers));
      if (response && response.status === 'success') {
        await this.refreshFromRemote(row);
      } else {
        throw new Error(response?.message || 'Failed to create sheet.');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error creating domain sheet';
      this.errorMessage.set(errorMsg);
      console.warn('Create sheet failed:', errorMsg);
      throw err;
    } finally {
      this.globalLoadingService.end(operation);
      this.isLoading.set(false);
    }
  }

  async updateDomainSheetRows(
    sheetName: string,
    updatedRows: Record<string, unknown>[],
    awaitRemoteSync = false,
    editedRowId?: string,
    createdRowId?: string,
  ): Promise<void> {
    if (!this.loadedRow) {
      throw new Error('No active catalog row selected.');
    }

    const row = this.loadedRow;
    const operation = this.globalLoadingService.begin();
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const catalogItem = (await this.dbService.db.catalogs.toArray()).find(
        (item) => item.row === row,
      );
      if (!catalogItem) {
        throw new Error('The active catalog item could not be found.');
      }

      const normalizedRows = updatedRows.
        filter(record => record != null && record !== undefined)
        .map((record, index) => {
          console.log("Normalizing record:", record);
          const normalized = this.serializeRecordTags(record, sheetName);
          return normalized;
        });
      const editedRow = editedRowId
        ? normalizedRows.find((record) => String(record['id']) === editedRowId)
        : undefined;
      const createdRow = createdRowId
        ? normalizedRows.find((record) => String(record['id']) === createdRowId)
        : undefined;
      if (editedRowId && !editedRow) {
        throw new Error('The domain row being edited is no longer available.');
      }
      if (createdRowId && !createdRow) {
        throw new Error('The domain row being created could not be found.');
      }
      if (editedRowId && createdRowId) {
        throw new Error('An update request cannot edit and create a row at the same time.');
      }
      const selectedRemoteRows = editedRow
        ? [editedRow]
        : createdRow
          ? [createdRow]
          : normalizedRows;
      const remoteRows = ['BOOK_EVENTS', 'RELATIONS', 'ASSOCIATIONS'].includes(
        sheetName.toUpperCase(),
      )
        ? selectedRemoteRows.map(
          ({ row: _displayRow, displayRow: _localDisplayRow, ...record }) => record,
        )
        : selectedRemoteRows;
      const localSampleDataEnabled = this.configService.isLocalSampleDataEnabled();
      const rowsWithPendingStatus = normalizedRows.map((record) => ({
        ...record,
        syncStatus: localSampleDataEnabled ? 'synced' : 'pending',
      }));

      if (localSampleDataEnabled && !DOMAIN_TABLES[sheetName.toUpperCase()]) {
        const storedSheets = await this.dbService.db.domainSheets.get(row);
        const customSheets = (storedSheets?.customSheets ?? []).map((sheet) =>
          sheet.name === sheetName ? { ...sheet, rows: rowsWithPendingStatus } : sheet,
        );
        await this.dbService.db.domainSheets.put({
          row,
          count: storedSheets?.count ?? this.sheets().length,
          customSheets,
        });
        this.updateLocalSheetRowsState(sheetName, rowsWithPendingStatus);
        return;
      }

      const tableName = this.getDomainTableName(sheetName);
      const persistedRows = this.preparePersistedRows(tableName, row, rowsWithPendingStatus);
      const table = this.domainTable(tableName);
      const nextSheets = this.sheets().map((sheet) =>
        sheet.name === sheetName ? { ...sheet, rows: rowsWithPendingStatus } : sheet,
      );
      const bookTags = await this.buildBookTags(row, nextSheets);

      await this.dbService.db.transaction('rw', [table, this.dbService.db.bookTags], async () => {
        await table.where('row').equals(row).delete();
        await table.bulkPut(persistedRows);
        await this.replaceBookTagsForCatalog(row, bookTags);
      });
      await this.dbService.db.domainSheets.put({ row, count: this.sheets().length || 1 });
      this.updateLocalSheetRowsState(sheetName, rowsWithPendingStatus);

      if (localSampleDataEnabled) {
        return;
      }

      if (awaitRemoteSync) {
        await this.syncRemoteUpdate(
          row,
          sheetName,
          remoteRows,
          catalogItem.id,
          true,
          normalizedRows,
          createdRowId,
        );
      } else {
        void this.syncRemoteUpdate(
          row,
          sheetName,
          remoteRows,
          catalogItem.id,
          false,
          normalizedRows,
          createdRowId,
        );
      }
    } catch (err: unknown) {
      const rowsWithErrorStatus = updatedRows.map((record) => ({
        ...record,
        syncStatus: 'error',
      }));
      const tableName = this.getDomainTableName(sheetName);
      const table = this.domainTable(tableName);
      const errorRows = this.preparePersistedRows(tableName, row, rowsWithErrorStatus);

      await this.dbService.db.transaction('rw', table, async () => {
        await table.where('row').equals(row).delete();
        await table.bulkPut(errorRows);
      });
      this.updateLocalSheetRowsState(sheetName, rowsWithErrorStatus);

      const errorMsg =
        err instanceof Error ? err.message : 'Unknown error updating domain sheet rows';
      this.errorMessage.set(errorMsg);
      console.warn('Update domain sheet rows failed:', errorMsg);
      throw err;
    } finally {
      this.globalLoadingService.end(operation);
      this.isLoading.set(false);
    }
  }

  async deleteDomainRow(sheetName: string, id: string): Promise<void> {
    const row = this.loadedRow;
    if (row === null) {
      throw new Error('No active catalog row selected.');
    }

    const normalizedSheetName = sheetName.toUpperCase();
    const currentSheets = this.sheets();
    const targetSheet = currentSheets.find(
      (sheet) => sheet.name.toUpperCase() === normalizedSheetName,
    );
    const deletedRow = targetSheet?.rows.find((record) => String(record['id']) === id);
    if (!targetSheet || !deletedRow) {
      return;
    }

    const catalogItem = (await this.dbService.db.catalogs.toArray()).find(
      (item) => item.row === row,
    );
    if (!catalogItem) {
      throw new Error('The active catalog item could not be found.');
    }

    if (this.configService.isLocalSampleDataEnabled() && !DOMAIN_TABLES[normalizedSheetName]) {
      const storedSheets = await this.dbService.db.domainSheets.get(row);
      const customSheets = (storedSheets?.customSheets ?? []).map((sheet) =>
        sheet.name.toUpperCase() === normalizedSheetName
          ? { ...sheet, rows: sheet.rows.filter((record) => String(record['id']) !== id) }
          : sheet,
      );
      await this.dbService.db.domainSheets.put({
        row,
        count: storedSheets?.count ?? this.sheets().length,
        customSheets,
      });
      this.sheets.set(
        currentSheets.map((sheet) =>
          sheet.name.toUpperCase() === normalizedSheetName
            ? { ...sheet, rows: sheet.rows.filter((record) => String(record['id']) !== id) }
            : sheet,
        ),
      );
      return;
    }

    const tableName = this.getDomainTableName(sheetName);
    const table = this.domainTable(tableName);
    const deletedIndex = targetSheet.rows.indexOf(deletedRow);
    const nextSheets = currentSheets.map((sheet) =>
      sheet.name.toUpperCase() === normalizedSheetName
        ? { ...sheet, rows: sheet.rows.filter((record) => String(record['id']) !== id) }
        : sheet,
    );
    const nextBookTags = await this.buildBookTags(row, nextSheets);
    const persistedDeletedRow = this.preparePersistedRows(tableName, row, [deletedRow])[0];
    let localDeleteCommitted = false;
    const operation = this.globalLoadingService.begin();
    this.isLoading.set(true);

    try {
      await this.dbService.db.transaction('rw', [table, this.dbService.db.bookTags], async () => {
        await table
          .where('row')
          .equals(row)
          .filter((record) => String(record['id']) === id)
          .delete();
        await this.replaceBookTagsForCatalog(row, nextBookTags);
      });
      localDeleteCommitted = true;
      if (this.loadedRow === row) {
        this.sheets.set(nextSheets);
      }

      if (normalizedSheetName === 'INDEX') {
        await this.taxonomyService.refreshGlobalTaxonomy(row);
      }
      if (!this.configService.isLocalSampleDataEnabled()) {
        await firstValueFrom(this.apiService.deleteRow(row, sheetName, id, catalogItem.id));
      }
    } catch (error) {
      if (localDeleteCommitted) {
        try {
          const rollbackSheets = this.sheets().map((sheet) => {
            if (
              this.loadedRow !== row ||
              sheet.name.toUpperCase() !== normalizedSheetName ||
              sheet.rows.some((record) => String(record['id']) === id)
            ) {
              return sheet;
            }

            const rows = [...sheet.rows];
            rows.splice(Math.min(deletedIndex, rows.length), 0, deletedRow);
            return { ...sheet, rows };
          });
          const rollbackBookTags = await this.buildBookTags(
            row,
            this.loadedRow === row ? rollbackSheets : currentSheets,
          );

          await this.dbService.db.transaction(
            'rw',
            [table, this.dbService.db.bookTags],
            async () => {
              await table.put(persistedDeletedRow);
              await this.replaceBookTagsForCatalog(row, rollbackBookTags);
            },
          );
          if (this.loadedRow === row) {
            this.sheets.set(rollbackSheets);
          }
          if (normalizedSheetName === 'INDEX') {
            await this.taxonomyService.refreshGlobalTaxonomy(row);
          }
        } catch (rollbackError) {
          console.error('Failed to roll back optimistic domain row deletion:', rollbackError);
          this.errorMessage.set(
            'The delete request failed and the local row could not be restored. Reload the catalog to reconcile the data.',
          );
          throw rollbackError;
        }
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete domain sheet row.';
      this.errorMessage.set(errorMessage);
      throw error;
    } finally {
      this.globalLoadingService.end(operation);
      this.isLoading.set(false);
    }
  }

  async getLocalDomainSheetRows(sheetName: string): Promise<Record<string, unknown>[]> {
    if (this.loadedRow === null) {
      return [];
    }

    const localSheets = await this.loadFromLocal(this.loadedRow);
    return (
      localSheets.find((sheet) => sheet.name.toUpperCase() === sheetName.toUpperCase())?.rows ?? []
    );
  }

  private deserializeRecordTags(
    record: Record<string, unknown>,
    sheetName: string,
  ): Record<string, unknown> {
    let normalizedTags = deserializeTagsFromBE(record['tags']);
    const normalizedRecord: Record<string, unknown> = {
      ...record,
      tags: normalizedTags,
    };
    return normalizedRecord;
  }


  private serializeRecordTags(
    record: Record<string, unknown>,
    sheetName: string,
  ): Record<string, unknown> {
    let normalizedTags = serializeTagsToBE(record['tags']);
    const normalizedRecord: Record<string, unknown> = {
      ...record,
      tags: normalizedTags,
    };
    return normalizedRecord;
  }

  private updateLocalSheetRowsState(sheetName: string, newRows: Record<string, unknown>[]): void {
    this.sheets.update((currentSheets) =>
      currentSheets.map((sheet) =>
        sheet.name === sheetName ? { ...sheet, rows: newRows } : sheet,
      ),
    );
  }

  private async refreshFromRemote(row: number, isBackground = false): Promise<void> {
    if (this.configService.isLocalSampleDataEnabled()) {
      return;
    }

    if (!isBackground) {
      this.isLoading.set(true);
    }

    try {
      const response = await firstValueFrom(this.apiService.getDomainSheets(row));

      if (!response || !response.data || !Array.isArray(response.data.sheets)) {
        return;
      }

      // 1. Transform raw elements into fully compliant DomainSheet objects
      const normalizedSheets: DomainSheet[] = response.data.sheets.map((sheet) => ({
        ...sheet,
        rows: sheet.rows.map((sourceRow) => this.deserializeRecordTags(sourceRow, sheet.name)),
        row, // Inject the parent catalog identifier
        id: sheet.name.toLowerCase(), // Generate the runtime identifier key
      }));

      // 2. Pass the fully compliant array to the sort utility
      const remoteSheets: DomainSheet[] = sortDomainTabs(normalizedSheets);

      const currentLocalString = JSON.stringify(this.sheets());
      const remoteDataString = JSON.stringify(remoteSheets);

      if (currentLocalString === remoteDataString) {
        return;
      }

      for (const sheet of remoteSheets) {
        const handler = this.featureHandlers.find((h) => h.name === sheet.name.toUpperCase());
        if (handler) {
          await handler.syncRemoteRows(row, sheet.rows);
        }
      }

      const bookTags = await this.buildBookTags(row, remoteSheets);
      await this.dbService.db.transaction('rw', [this.dbService.db.bookTags], async () => {
        await this.replaceBookTagsForCatalog(row, bookTags);
      });

      await this.taxonomyService.refreshGlobalTaxonomy(row);

      // Remote data is merged into IndexedDB, so show the full stored rows, not only the response.
      const normalizedRemoteSheets = await Promise.all(
        remoteSheets.map(async (sheet) => {
          const handler = this.featureHandlers.find((h) => h.name === sheet.name.toUpperCase());
          const localSheet = handler ? await handler.loadLocalSheet(row) : null;
          return localSheet ? { ...localSheet, index: sheet.index } : sheet;
        }),
      );
      this.sheets.set(normalizedRemoteSheets);
    } catch (error) {
      console.error('[Local-First] Remote sync parsing failed:', error);
      if (!isBackground) {
        this.errorMessage.set(error instanceof Error ? error.message : 'Remote sync failed.');
      }
    } finally {
      if (!isBackground) {
        this.isLoading.set(false);
      }
    }
  }

  private async loadFromLocal(row: number): Promise<DomainSheet[]> {
    const localSheets: DomainSheet[] = [];
    for (const handler of this.featureHandlers) {
      try {
        const sheet = await handler.loadLocalSheet(row);
        if (sheet !== null) {
          sheet.index = localSheets.length;
          localSheets.push(sheet);
        }
      } catch (error) {
        console.error(
          `[Local-First] Error cargando datos locales para el dominio: ${handler.name}`,
          error,
        );
      }
    }

    const storedSheets = await this.dbService.db.domainSheets.get(row);
    for (const customSheet of storedSheets?.customSheets ?? []) {
      localSheets.push({
        row,
        id: customSheet.name.toLowerCase(),
        name: customSheet.name,
        index: customSheet.index,
        rows: customSheet.rows,
      });
    }

    return sortDomainTabs(localSheets);
  }

  private async syncRemoteUpdate(
    row: number,
    sheetName: string,
    updatedRows: Record<string, unknown>[],
    catalogItemId: string,
    rethrowErrors = false,
    localRowsToSync = updatedRows,
    createdLocalRowId?: string,
  ): Promise<void> {
    if (this.configService.isLocalSampleDataEnabled()) {
      return;
    }

    try {
      // 1. Send mutations to the remote Backend API
      const response = await firstValueFrom(
        this.apiService.updateRows(
          row,
          sheetName,
          updatedRows,
          catalogItemId,
          createdLocalRowId !== undefined,
        ),
      );

      let rowsToSync = localRowsToSync;
      if (createdLocalRowId !== undefined) {
        const createdId = (response as { createdRowId?: unknown } | null)?.createdRowId;
        if (typeof createdId !== 'string' || !createdId) {
          throw new Error('The backend did not return the ID assigned to the created row.');
        }
        rowsToSync = localRowsToSync.map((record) =>
          String(record['id']) === createdLocalRowId ? { ...record, id: createdId } : record,
        );
      }

      const syncedRows = rowsToSync.map((record) => ({
        ...record,
        syncStatus: 'synced',
      }));

      // 2. Resolve the matching specialized feature service
      const normalizedName = sheetName.toUpperCase();
      const handler = this.featureHandlers.find((h) => h.name === normalizedName);

      if (!handler) {
        throw new Error(`No registered feature handler found for domain: ${sheetName}`);
      }

      // 3. Delegate Dexie persistence to the feature service
      await handler.syncRemoteRows(row, syncedRows);

      // 4. CRUCIAL: Keep this to sync RAM state signals for your template UI layers
      this.updateLocalSheetRowsState(sheetName, syncedRows);
    } catch (err: unknown) {
      console.warn(
        `Background remote update failed; local data remains available for ${sheetName}:`,
        err,
      );
      if (rethrowErrors) {
        throw err;
      }
    }
  }

  private getDomainTableName(sheetName: string): DomainTableName {
    const normalized = sheetName.toUpperCase();
    const tableName = DOMAIN_TABLES[normalized];
    if (!tableName) {
      throw new Error(`Unsupported domain sheet: ${sheetName}`);
    }
    return tableName;
  }

  private async buildBookTags(row: number, sheets: DomainSheet[]): Promise<BookTag[]> {
    const catalogItem = (await this.dbService.db.catalogs.toArray()).find(
      (item) => item.row === row,
    );
    const book = catalogItem?.name.trim() || String(row);
    const author = catalogItem?.author.trim() || undefined;
    const counts = new Map<string, BookTag>();

    for (const sheet of sortDomainTabs(sheets)) {
      const tableName = DOMAIN_TABLES[sheet.name.toUpperCase()];
      if (!tableName) {
        continue;
      }

      for (const sourceRow of sheet.rows) {
        for (const tag of parseTagsFromArray(sourceRow['tags'])) {
          if (new RegExp(`^${tableName}_\\d+$`).test(tag)) {
            continue;
          }

          const id = `${row}_${tag.toLocaleLowerCase()}`;
          const existing = counts.get(id);
          if (existing) {
            existing.usageCount = (existing.usageCount ?? 0) + 1;
          } else {
            counts.set(id, {
              id,
              scope: 'book',
              row,
              book,
              ...(author ? { author } : {}),
              ...(catalogItem?.subject ? { subject: catalogItem.subject } : {}),
              ...(catalogItem?.topic ? { topic: catalogItem.topic } : {}),
              name: tag,
              domain: sheet.name,
              usageCount: 1,
            });
          }
        }
      }
    }

    return [...counts.values()];
  }

  private async replaceBookTagsForCatalog(row: number, bookTags: BookTag[]): Promise<void> {
    await this.dbService.db.bookTags.where('row').equals(row).delete();
    if (bookTags.length > 0) {
      await this.dbService.db.bookTags.bulkPut(bookTags);
    }
  }

  /**
   * Fetches one remote page for any book/sheet and stores it in IndexedDB without touching
   * the sheets currently displayed. Locally pending rows are never overwritten.
   */
  async fetchRemotePageToLocal(
    row: number,
    sheetName: string,
    page: number,
  ): Promise<{ added: number; totalPages: number }> {
    const response = await firstValueFrom(
      this.apiService.getPaginatedRows(row, sheetName, page, DOMAIN_PAGE_SIZE),
    );
    if (!Array.isArray(response?.rows)) {
      throw new Error('Malformed paginated domain response: rows array is missing.');
    }

    const tableName = this.getDomainTableName(sheetName);
    const table = this.domainTable(tableName);
    const incoming = this.preparePersistedRows(
      tableName,
      row,
      this.mapPaginatedRows(row, sheetName, page, response.rows),
    );
    const existing = await table.bulkGet(incoming.map((item) => item.id));
    const pendingIds = new Set(
      existing.filter((item) => item?.syncStatus === 'pending').map((item) => item!.id),
    );
    const existingIds = new Set(existing.filter(Boolean).map((item) => item!.id));
    const toStore = incoming.filter((item) => !pendingIds.has(item.id));
    await table.bulkPut(toStore);

    return {
      added: toStore.filter((item) => !existingIds.has(item.id)).length,
      totalPages: response.totalPages,
    };
  }

  async countLocalRows(row: number, sheetName: string): Promise<number> {
    const table = this.domainTable(this.getDomainTableName(sheetName));
    return table.where('row').equals(row).count();
  }

  private mapPaginatedRows(
    row: number,
    sheetName: string,
    page: number,
    sourceRows: Record<string, unknown>[],
  ): Record<string, unknown>[] {
    const tableName = this.getDomainTableName(sheetName);
    return sourceRows.map((sourceRow, index) => {
      const normalizedRow = this.deserializeRecordTags(
        this.normalizePaginatedRow(sourceRow),
        sheetName,
      );
      const displayRow = (page - 1) * DOMAIN_PAGE_SIZE + index + 1;
      const isRelation = ['RELATIONS', 'ASSOCIATIONS'].includes(sheetName.toUpperCase());
      return {
        ...normalizedRow,
        id: String(normalizedRow['id'] ?? `${tableName}_${row}_${page}_${index}`),
        row: isRelation ? displayRow : row,
        ...(isRelation ? { displayRow } : {}),
        syncStatus: 'synced',
      };
    });
  }

  private paginationKey(sheetName: string): string {
    return `${this.loadedRow ?? 'none'}:${sheetName.toUpperCase()}`;
  }

  private normalizePaginatedRow(sourceRow: Record<string, unknown>): Record<string, unknown> {
    const headerNames: Record<string, string> = {
      id: 'id',
      name: 'name',
      role: 'role',
      nature: 'nature',
      color: 'color',
      term: 'term',
      definition: 'definition',
      partofspeech: 'partOfSpeech',
      etymology: 'etymology',
      synonyms: 'synonyms',
      contextsentence: 'contextSentence',
      title: 'title',
      passagetext: 'passageText',
      book: 'book',
      author: 'author',
      page: 'page',
      tags: 'tags',
      feed: 'feed',
      contributor: 'contributor',
      chapter: 'chapter',
      theme: 'theme',
      subtheme: 'subtheme',
      quote: 'quote',
      analysis: 'analysis',
      category: 'category',
      archetype: 'archetype',
      source: 'source',
      syncstatus: 'syncStatus',
      sourcecharacterid: 'sourceCharacterId',
      targetcharacterid: 'targetCharacterId',
      sourceconceptid: 'sourceConceptId',
      targetconceptid: 'targetConceptId',
      relationtype: 'relationType',
      maincharacterid: 'mainCharacterId',
      secondarycharacterids: 'secondaryCharacterIds',
      placeid: 'placeId',
      datetimestart: 'dateTimeStart',
      datetimeend: 'dateTimeEnd',
      datelabel: 'dateLabel',
      eventorder: 'eventOrder',
    };

    return Object.fromEntries(
      Object.entries(sourceRow).map(([key, value]) => [
        headerNames[key.replace(/[^a-z0-9]/gi, '').toLowerCase()] ?? key,
        value,
      ]),
    );
  }

  private mergeRows(
    currentRows: Record<string, unknown>[],
    incomingRows: Record<string, unknown>[],
  ): Record<string, unknown>[] {
    const rowsById = new Map<string, Record<string, unknown>>();

    currentRows.forEach((row, index) => {
      rowsById.set(String(row['id'] ?? `cached-${index}`), row);
    });
    incomingRows.forEach((row, index) => {
      rowsById.set(String(row['id'] ?? `incoming-${index}`), row);
    });

    return [...rowsById.values()];
  }

  private domainTable(tableName: DomainTableName): Table<PersistedDomainRow, string> {
    return this.dbService.db[tableName] as unknown as Table<PersistedDomainRow, string>;
  }

  private preparePersistedRows(
    tableName: DomainTableName,
    row: number,
    sourceRows: Record<string, unknown>[],
  ): PersistedDomainRow[] {
    return sourceRows.map((sourceRow, index) => {
      return {
        ...sourceRow,
        id: String(sourceRow['id'] ?? `${tableName}_${row}_${index}`),
        row,
        ...(tableName === 'relationsCharacters' || tableName === 'relationsConcepts'
          ? { displayRow: Number(sourceRow['displayRow'] ?? index + 1) }
          : {}),
        tags: serializeTagsToArray(sourceRow['tags']),
        syncStatus: (sourceRow['syncStatus'] as PersistedDomainRow['syncStatus']) ?? 'pending',
      };
    });
  }
}
