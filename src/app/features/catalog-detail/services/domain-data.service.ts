import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppDbService } from '../../../core/services/storage/app-db.service';
import { DomainDataApiService } from './domain-data-api.service';
import { DomainSheet } from '../models/domain-sheet.model';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';
import { GlobalLoadingService } from '../../../core/services/global-loading.service';

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

  readonly sheets = signal<DomainSheet[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  private loadedRow: number | null = null;

  readonly sheetNames = computed(() => this.sheets().map((sheet) => sheet.name));

  async loadForCatalog(row: number): Promise<void> {
    const operation = this.globalLoadingService.begin();
    this.loadedRow = row;
    this.errorMessage.set(null);

    try {
      const cached = await this.dbService.db.domainSheets.where('row').equals(row).toArray();
      if (this.loadedRow === row) {
        this.sheets.set(sortByIndex(cached));
      }

      if (this.authService.idToken()) {
        await this.refreshFromRemote(row);
      }
    } finally {
      this.globalLoadingService.end(operation);
    }
  }

  /**
   * Provisions a brand new domain sheet with user-defined name and headers.
   */
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
        // Refresh sheets state from remote to pull the newly generated structure
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

/**
   * HTTP POST: Optimistically save or update domain sheet rows locally and push to Google Sheets.
   */
  async updateDomainSheetRows(sheetName: string, updatedRows: Record<string, unknown>[]): Promise<void> {
    if (!this.loadedRow) {
      throw new Error('No active catalog row selected.');
    }

    const row = this.loadedRow;
    const operation = this.globalLoadingService.begin();
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // 1. Marcar las filas como 'pending' para la actualización optimista local
    const rowsWithPendingStatus = updatedRows.map(r => ({
      ...r,
      syncStatus: 'pending'
    }));

    try {
      // Guardar localmente usando el índice 'row' y filtrando por nombre de hoja en memoria
      await this.dbService.db.transaction('rw', this.dbService.db.domainSheets, async () => {
        const sheetsForCatalogRow = await this.dbService.db.domainSheets
          .where('row')
          .equals(row)
          .toArray();

        let targetSheet = sheetsForCatalogRow.find(s => s.name === sheetName);
        if (targetSheet) {
          targetSheet.rows = rowsWithPendingStatus;
          await this.dbService.db.domainSheets.put(targetSheet);
        } else {
          // Si la hoja no existía localmente todavía, la inicializamos
          targetSheet = {
            row,
            id: sheetName.trim().toLowerCase(),
            name: sheetName,
            index: sheetsForCatalogRow.length,
            rows: rowsWithPendingStatus
          };
          await this.dbService.db.domainSheets.put(targetSheet);
        }
      });

      this.updateLocalSheetRowsState(sheetName, rowsWithPendingStatus);

      // 2. Enviar la petición POST al servidor de Google Apps Script
      const response = await firstValueFrom(this.apiService.updateRows(row, sheetName, updatedRows));

      if (response && response.status === 'success') {
        // 3. Al recibir la respuesta exitosa, cambiar el estado local a 'synced'
        const rowsWithSyncedStatus = updatedRows.map(r => ({
          ...r,
          syncStatus: 'synced'
        }));

        await this.dbService.db.transaction('rw', this.dbService.db.domainSheets, async () => {
          const sheetsForCatalogRow = await this.dbService.db.domainSheets
            .where('row')
            .equals(row)
            .toArray();

          const targetSheet = sheetsForCatalogRow.find(s => s.name === sheetName);
          if (targetSheet) {
            targetSheet.rows = rowsWithSyncedStatus;
            await this.dbService.db.domainSheets.put(targetSheet);
          }
        });

        this.updateLocalSheetRowsState(sheetName, rowsWithSyncedStatus);
      } else {
        const message = typeof response?.message === 'string' ? response.message : '';
        if (
          response?.status === 'error' &&
          (message.includes('Invalid or expired Google token') || message.includes('Missing idToken parameter'))
        ) {
          console.warn('Google token expired or missing; logging the user out.');
          this.authService.logout();
        }

        throw new Error(message || 'Failed to update domain sheet rows.');
      }
    } catch (err: unknown) {
      // 4. Si ocurre un error, marcar las filas con estado 'error'
      const rowsWithErrorStatus = updatedRows.map(r => ({
        ...r,
        syncStatus: 'error'
      }));

      await this.dbService.db.transaction('rw', this.dbService.db.domainSheets, async () => {
        const sheetsForCatalogRow = await this.dbService.db.domainSheets
          .where('row')
          .equals(row)
          .toArray();

        const targetSheet = sheetsForCatalogRow.find(s => s.name === sheetName);
        if (targetSheet) {
          targetSheet.rows = rowsWithErrorStatus;
          await this.dbService.db.domainSheets.put(targetSheet);
        }
      });

      this.updateLocalSheetRowsState(sheetName, rowsWithErrorStatus);

      const errorMsg = err instanceof Error ? err.message : 'Unknown error updating domain sheet rows';
      this.errorMessage.set(errorMsg);
      console.warn('Update domain sheet rows failed:', errorMsg);
      throw err;
    } finally {
      this.globalLoadingService.end(operation);
      this.isLoading.set(false);
    }
  }

  private updateLocalSheetRowsState(sheetName: string, newRows: Record<string, unknown>[]): void {
    this.sheets.update((currentSheets) => {
      return currentSheets.map((sheet) => {
        if (sheet.name === sheetName) {
          return { ...sheet, rows: newRows };
        }
        return sheet;
      });
    });
  }


  private async refreshFromRemote(row: number): Promise<void> {
    const idToken = this.authService.idToken();
    if (!idToken) {
      this.errorMessage.set('CATALOG.ERRORS.authRequired');
      console.warn('Sync aborted: User is not authenticated with Google.');
      return;
    }

    const operation = this.globalLoadingService.begin();
    this.isLoading.set(true);
    try {
      const response = await firstValueFrom(this.apiService.getDomainSheets(row));

      if (response && response.status === 'success') {
        const rawSheets = Array.isArray(response.data?.sheets) ? response.data.sheets : [];

        const normalized: DomainSheet[] = rawSheets.map((sheet) => ({
          row,
          id: sheet.name.trim().toLowerCase(),
          name: sheet.name,
          index: sheet.index,
          rows: sheet.rows,
        }));

        await this.dbService.db.transaction('rw', this.dbService.db.domainSheets, async () => {
          await this.dbService.db.domainSheets.where('row').equals(row).delete();
          if (normalized.length > 0) {
            await this.dbService.db.domainSheets.bulkPut(normalized);
          }
        });

        if (this.loadedRow === row) {
          this.sheets.set(sortByIndex(normalized));
        }
      } else {
        const message = typeof response?.message === 'string' ? response.message : '';
        if (
          response?.status === 'error' &&
          (message.includes('Invalid or expired Google token') || message.includes('Missing idToken parameter'))
        ) {
          console.warn('Google token expired or missing; logging the user out.');
          this.authService.logout();
        }

        throw new Error(message || 'Malformed domain sheets response.');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error fetching domain sheets';
      this.errorMessage.set(errorMsg);
      console.warn('Domain sheets remote fetch failed; keeping local cache:', errorMsg);
    } finally {
      this.globalLoadingService.end(operation);
      this.isLoading.set(false);
    }
  }
}