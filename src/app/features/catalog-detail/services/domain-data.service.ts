import { Injectable, computed, inject, signal } from '@angular/core';
import { Table } from 'dexie';
import { firstValueFrom } from 'rxjs';
import { AppDbService } from '../../../core/services/storage/app-db.service';
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

  private loadedRow: number | null = null;

  readonly sheetNames = computed(() => this.sheets().map((sheet) => sheet.name));

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

      this.isLoading.set(false);
      if (this.authService.idToken()) {
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

    const rowsWithPendingStatus = updatedRows.map((record) => ({
      ...record,
      syncStatus: 'pending',
    }));

    try {
      const tableName = this.getDomainTableName(sheetName);
      const persistedRows = this.preparePersistedRows(tableName, row, rowsWithPendingStatus);
      const table = this.domainTable(tableName);

      await this.dbService.db.transaction('rw', table, async () => {
        await table.where('row').equals(row).delete();
        await table.bulkPut(persistedRows);
      });
      await this.dbService.db.domainSheets.put({ row, count: this.sheets().length || 1 });
      this.updateLocalSheetRowsState(sheetName, rowsWithPendingStatus);

      if (this.configService.isLocalFirstEnabled()) {
        void this.syncRemoteUpdate(row, sheetName, tableName, updatedRows);
        return;
      }

      const response = await firstValueFrom(
        this.apiService.updateRows(row, sheetName, updatedRows),
      );
      if (response && response.status === 'success') {
        const rowsWithSyncedStatus = updatedRows.map((record) => ({
          ...record,
          syncStatus: 'synced',
        }));
        const syncedRows = this.preparePersistedRows(tableName, row, rowsWithSyncedStatus);

        await this.dbService.db.transaction('rw', table, async () => {
          await table.where('row').equals(row).delete();
          await table.bulkPut(syncedRows);
        });
        this.updateLocalSheetRowsState(sheetName, rowsWithSyncedStatus);
      } else {
        const message = typeof response?.message === 'string' ? response.message : '';
        if (
          response?.status === 'error' &&
          (message.includes('Invalid or expired Google token') ||
            message.includes('Missing idToken parameter'))
        ) {
          this.authService.logout();
        }
        throw new Error(message || 'Failed to update domain sheet rows.');
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
      const normalized: DomainSheet[] = rawSheets.map((sheet) => ({
        row,
        id: sheet.name.trim().toLowerCase(),
        name: sheet.name,
        index: sheet.index,
        rows: sheet.rows,
      }));

      const tables = [
        this.dbService.db.domainSheets,
        ...DOMAIN_TABLE_NAMES.map((name) => this.domainTable(name)),
      ];
      await this.dbService.db.transaction('rw', tables, async (transaction) => {
        await transaction.table('domainSheets').put({ row, count: normalized.length });
        for (const tableName of DOMAIN_TABLE_NAMES) {
          const table = transaction.table(tableName) as Table<PersistedDomainRow, string>;
          await table.where('row').equals(row).delete();
        }

        for (const sheet of normalized) {
          const tableName = this.getDomainTableName(sheet.name);
          const persistedRows = this.preparePersistedRows(tableName, row, sheet.rows);
          const table = transaction.table(tableName) as Table<PersistedDomainRow, string>;
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
          rows: rows.map((record) => {
            const { id, row: _, tag, syncStatus, ...data } = record;
            return data;
          }),
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
