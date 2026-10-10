import { Injectable, computed, inject, signal } from '@angular/core';
import { Table } from 'dexie';
import { firstValueFrom } from 'rxjs';
import { AppDbService, BookTag } from '../../../core/services/storage/app-db.service';
import { DomainDataApiService } from './domain-data-api.service';
import { DomainSheet } from '../models/domain-sheet.model';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';
import { GlobalLoadingService } from '../../../core/services/global-loading.service';
import { ConfigService } from '../../../core/services/config.service';

type DomainTableName =
  | 'indexTopics'
  | 'concepts'
  | 'quotes'
  | 'passages'
  | 'timeline'
  | 'relations'
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
  tag: string;
  syncStatus: 'pending' | 'synced' | 'error';
}

const DOMAIN_TABLES: Record<string, DomainTableName> = {
  INDEX: 'indexTopics',
  CONCEPTS: 'concepts',
  QUOTES: 'quotes',
  PASSAGES: 'passages',
  TIMELINE: 'timeline',
  RELATIONS: 'relations',
  GLOSARY: 'glosary',
  QUESTIONS: 'questions',
};

const DOMAIN_TABLE_NAMES = Object.values(DOMAIN_TABLES) as DomainTableName[];

function sortByIndex(sheets: DomainSheet[]): DomainSheet[] {
  return [...sheets].sort((a, b) => a.index - b.index);
}

@Injectable({
  providedIn: 'root',
})
export class DomainDataService {
  private dbService = inject(AppDbService);
  private apiService = inject(DomainDataApiService);
  private authService = inject(GoogleAuthService);
  private globalLoadingService = inject(GlobalLoadingService);
  private configService = inject(ConfigService);

  readonly sheets = signal<DomainSheet[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly pagination = signal<Record<string, SheetPaginationState>>({});

  private loadedRow: number | null = null;

  readonly sheetNames = computed(() => this.sheets().map((sheet) => sheet.name));

  extractAndNormalizeTags(rawTags: string): string[] {
    const uniqueTags = new Set<string>();
    for (const value of rawTags.split(/[\s,;]+/)) {
      const tag = value.trim().replace(/^#+/, '').toLocaleLowerCase();
      if (tag) {
        uniqueTags.add(`#${tag}`);
      }
    }
    return [...uniqueTags];
  }

  async upsertBookTags(tags: string[], bookContext: BookTagContext): Promise<void> {
    const normalizedTags = this.extractAndNormalizeTags(tags.join(' '));
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
          tag,
          usageCount: (existing?.usageCount ?? 0) + 1,
        });
      }
    });
  }

  canLoadMore(sheetName: string): boolean {
    const state = this.pagination()[this.paginationKey(sheetName)];
    return !state || state.totalPages === null || state.page < state.totalPages;
  }

  async loadNextPage(sheetName: string): Promise<void> {
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
      const pageRows = response.rows.map((sourceRow, index) => {
        const normalizedRow = this.normalizePaginatedRow(sourceRow);
        return {
          ...normalizedRow,
          id: String(normalizedRow['id'] ?? `${tableName}_${row}_${nextPage}_${index}`),
          row,
          syncStatus: 'synced',
        };
      });
      const persistedRows = this.preparePersistedRows(tableName, row, pageRows);
      const table = this.domainTable(tableName);
      const nextSheets = this.sheets().map((currentSheet) =>
        currentSheet.name === sheetName
          ? { ...currentSheet, rows: this.mergeRows(currentSheet.rows, pageRows) }
          : currentSheet,
      );
      const bookTags = await this.buildBookTags(row, nextSheets);
      await this.dbService.db.transaction('rw', [table, this.dbService.db.bookTags], async () => {
        await table.bulkPut(persistedRows);
        await this.replaceBookTagsForCatalog(row, bookTags);
      });
      this.sheets.set(nextSheets);
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
      if (localSheets.length > 0) {
        this.sheets.set(localSheets);
      }

      if (!this.configService.isLocalFirstEnabled()) {
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
        void this.refreshFromRemote(row, true);
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
  ): Promise<void> {
    if (!this.loadedRow) {
      throw new Error('No active catalog row selected.');
    }

    const row = this.loadedRow;
    const operation = this.globalLoadingService.begin();
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const tableName = this.getDomainTableName(sheetName);
      const existingRows = this.sheets().find((sheet) => sheet.name === sheetName)?.rows ?? [];
      const newRowStart = Math.min(existingRows.length, updatedRows.length);
      const newRows = updatedRows.slice(newRowStart);
      const catalogItem = (await this.dbService.db.catalogs.toArray()).find(
        (item) => item.row === row,
      );
      const normalizedNewRows = newRows.map((record) =>
        this.normalizeRecordTags(record, sheetName),
      );

      for (const record of normalizedNewRows) {
        const tags = this.extractAndNormalizeTags(
          [record['tags'], record['tag']]
            .filter((value): value is string => typeof value === 'string')
            .join(' '),
        );
        await this.upsertBookTags(tags, {
          row,
          book: this.optionalString(record['book']) ?? catalogItem?.name,
          author: this.optionalString(record['author']) ?? catalogItem?.author,
          subject: catalogItem?.subject,
          topic: catalogItem?.topic,
          domain: sheetName,
        });
      }

      const normalizedRows = [...updatedRows.slice(0, newRowStart), ...normalizedNewRows];
      const rowsWithPendingStatus = normalizedRows.map((record) => ({
        ...record,
        syncStatus: 'pending',
      }));
      const persistedRows = this.preparePersistedRows(tableName, row, rowsWithPendingStatus);
      const table = this.domainTable(tableName);

      await this.dbService.db.transaction('rw', table, async () => {
        await table.where('row').equals(row).delete();
        await table.bulkPut(persistedRows);
      });
      await this.dbService.db.domainSheets.put({ row, count: this.sheets().length || 1 });
      this.updateLocalSheetRowsState(sheetName, rowsWithPendingStatus);

      void this.syncRemoteUpdate(row, sheetName, tableName, normalizedRows);
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

  private normalizeRecordTags(
    record: Record<string, unknown>,
    sheetName: string,
  ): Record<string, unknown> {
    const rawTags = [record['tags'], record['tag']]
      .filter((value): value is string => typeof value === 'string')
      .join(' ');
    const normalizedTags = this.extractAndNormalizeTags(rawTags).join(' ');
    const normalizedRecord = { ...record };

    if (Object.hasOwn(record, 'tags') || ['QUOTES', 'PASSAGES'].includes(sheetName.toUpperCase())) {
      normalizedRecord['tags'] = normalizedTags;
    }
    if (Object.hasOwn(record, 'tag')) {
      normalizedRecord['tag'] = normalizedTags;
    }

    return normalizedRecord;
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private updateLocalSheetRowsState(sheetName: string, newRows: Record<string, unknown>[]): void {
    this.sheets.update((currentSheets) =>
      currentSheets.map((sheet) =>
        sheet.name === sheetName ? { ...sheet, rows: newRows } : sheet,
      ),
    );
  }

  private async refreshFromRemote(row: number, background = false): Promise<void> {
    const idToken = this.authService.idToken();
    if (!idToken) {
      this.errorMessage.set('CATALOG.ERRORS.authRequired');
      console.warn('Sync aborted: User is not authenticated with Google.');
      return;
    }

    const operation = background ? null : this.globalLoadingService.begin();
    if (!background) {
      this.isLoading.set(true);
    }
    try {
      const response = await firstValueFrom(this.apiService.getDomainSheets(row));
      if (!response || response.status !== 'success') {
        const message = typeof response?.message === 'string' ? response.message : '';
        if (
          response?.status === 'error' &&
          (message.includes('Invalid or expired Google token') ||
            message.includes('Missing idToken parameter'))
        ) {
          this.authService.logout();
        }
        throw new Error(message || 'Malformed domain sheets response.');
      }

      const rawSheets = Array.isArray(response.data?.sheets) ? response.data.sheets : [];
      const cachedSheets = await this.loadFromLocal(row);
      const normalized: DomainSheet[] = [];
      for (const sheet of rawSheets) {
        const name = sheet.name.trim();
        if (!name || !DOMAIN_TABLES[name.toUpperCase()]) {
          continue;
        }
        const cachedSheet = cachedSheets.find(
          (candidate) => candidate.name.toUpperCase() === name.toUpperCase(),
        );

        normalized.push({
          row,
          id: name.toLowerCase(),
          name,
          index: sheet.index,
          rows: sheet.rows.length > 0 ? sheet.rows : (cachedSheet?.rows ?? []),
        });
      }
      const bookTags = await this.buildBookTags(row, normalized);

      const tables = [
        this.dbService.db.domainSheets,
        this.dbService.db.bookTags,
        ...DOMAIN_TABLE_NAMES.map((name) => this.domainTable(name)),
      ];
      await this.dbService.db.transaction('rw', tables, async (transaction) => {
        await transaction.table('domainSheets').put({ row, count: normalized.length });
        await this.replaceBookTagsForCatalog(row, bookTags);
        for (const sheet of normalized) {
          if (sheet.rows.length === 0) {
            continue;
          }

          const tableName = this.getDomainTableName(sheet.name);
          const table = transaction.table(tableName) as Table<PersistedDomainRow, string>;
          await table.where('row').equals(row).delete();
          const persistedRows = this.preparePersistedRows(tableName, row, sheet.rows);
          await table.bulkPut(persistedRows);
        }
      });

      if (this.loadedRow === row) {
        this.sheets.set(sortByIndex(normalized));
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error fetching domain sheets';
      this.errorMessage.set(errorMsg);
      console.warn('Domain sheets remote fetch failed; keeping local cache:', errorMsg);
    } finally {
      if (operation) {
        this.globalLoadingService.end(operation);
      }
      if (!background) {
        this.isLoading.set(false);
      }
    }
  }

  private async loadFromLocal(row: number): Promise<DomainSheet[]> {
    const localSheets: DomainSheet[] = [];

    for (const [name, tableName] of Object.entries(DOMAIN_TABLES)) {
      const rows = await this.domainTable(tableName).where('row').equals(row).toArray();
      if (rows.length > 0) {
        localSheets.push({
          row,
          id: name.toLowerCase(),
          name,
          index: localSheets.length,
          rows: rows.map(({ row: _catalogRow, ...record }) => record),
        });
      }
    }

    return sortByIndex(localSheets);
  }

  private async syncRemoteUpdate(
    row: number,
    sheetName: string,
    tableName: DomainTableName,
    updatedRows: Record<string, unknown>[],
  ): Promise<void> {
    try {
      await firstValueFrom(this.apiService.updateRows(row, sheetName, updatedRows));
      const syncedRows = updatedRows.map((record) => ({
        ...record,
        syncStatus: 'synced',
      }));
      const table = this.domainTable(tableName);
      await this.dbService.db.transaction('rw', table, async () => {
        await table.where('row').equals(row).delete();
        await table.bulkPut(this.preparePersistedRows(tableName, row, syncedRows));
      });
      this.updateLocalSheetRowsState(sheetName, syncedRows);
    } catch (err: unknown) {
      console.warn('Background remote update failed; local data remains available:', err);
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

    for (const sheet of sortByIndex(sheets)) {
      const tableName = DOMAIN_TABLES[sheet.name.toUpperCase()];
      if (!tableName) {
        continue;
      }

      for (const sourceRow of sheet.rows) {
        const rawTags =
          sourceRow['tags'] ?? sourceRow['Tags'] ?? sourceRow['tag'] ?? sourceRow['Tag'];
        if (typeof rawTags !== 'string') {
          continue;
        }

        for (const tag of rawTags
          .split(/[\s,;]+/)
          .map((value) => value.trim())
          .filter(Boolean)) {
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
              tag,
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

  private paginationKey(sheetName: string): string {
    return `${this.loadedRow ?? 'none'}:${sheetName.toUpperCase()}`;
  }

  private normalizePaginatedRow(sourceRow: Record<string, unknown>): Record<string, unknown> {
    const headerNames: Record<string, string> = {
      id: 'id',
      term: 'term',
      definition: 'definition',
      title: 'title',
      passagetext: 'passageText',
      book: 'book',
      author: 'author',
      page: 'page',
      tags: 'tags',
      tag: 'tag',
      feed: 'feed',
      contributor: 'contributor',
      chapter: 'chapter',
      theme: 'theme',
      subtheme: 'subtheme',
      quote: 'quote',
      analysis: 'analysis',
      category: 'category',
      source: 'source',
      syncstatus: 'syncStatus',
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
    return sourceRows.map((sourceRow, index) => ({
      ...sourceRow,
      id: String(sourceRow['id'] ?? `${tableName}_${row}_${index}`),
      row,
      tag: String(sourceRow['tag'] ?? sourceRow['tags'] ?? `${tableName}_${index}`),
      syncStatus: (sourceRow['syncStatus'] as PersistedDomainRow['syncStatus']) ?? 'pending',
    }));
  }
}
