import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppDbService } from '../../../core/services/storage/app-db.service';
import { ConfigService } from '../../../core/services/config.service';
import { DomainDataApiService } from './domain-data-api.service';
import { DomainSheet } from '../models/domain-sheet.model';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';

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
  private configService = inject(ConfigService);

  readonly sheets = signal<DomainSheet[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  private loadedRow: number | null = null;

  readonly sheetNames = computed(() => this.sheets().map((sheet) => sheet.name));

  async loadForCatalog(row: number): Promise<void> {
    this.loadedRow = row;
    this.errorMessage.set(null);

    const cached = await this.dbService.db.domainSheets.where('row').equals(row).toArray();
    if (this.loadedRow === row) {
      this.sheets.set(sortByIndex(cached));
    }

    if (this.configService.useSampleData() || this.authService.idToken()) {
      await this.refreshFromRemote(row);
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
      this.isLoading.set(false);
    }
  }

  private async refreshFromRemote(row: number): Promise<void> {
    const idToken = this.authService.idToken();
    if (!this.configService.useSampleData() && !idToken) {
      this.errorMessage.set('CATALOG.ERRORS.authRequired');
      console.warn('Sync aborted: User is not authenticated with Google.');
      return;
    }

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
      this.isLoading.set(false);
    }
  }
}