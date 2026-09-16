import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppDbService } from '../../../core/services/storage/app-db.service';
import { DomainDataApiService } from './domain-data-api.service';
import { DomainSheet } from '../models/domain-sheet.model';

// Tabs are rendered in the order defined by each sheet's `index`.
function sortByIndex(sheets: DomainSheet[]): DomainSheet[] {
  return [...sheets].sort((a, b) => a.index - b.index);
}

@Injectable({
  providedIn: 'root',
})
export class DomainDataService {
  private dbService = inject(AppDbService);
  private apiService = inject(DomainDataApiService);

  readonly sheets = signal<DomainSheet[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  private loadedRow: number | null = null;

  readonly sheetNames = computed(() => this.sheets().map((sheet) => sheet.name));

  /**
   * Cache-first load for one Catalog entry's Domain Data Sheets, then refreshes in the background.
   */
  async loadForCatalog(row: number): Promise<void> {
    this.loadedRow = row;
    this.errorMessage.set(null);

    const cached = await this.dbService.db.domainSheets.where('row').equals(row).toArray();
    if (this.loadedRow === row) {
      this.sheets.set(sortByIndex(cached));
    }

    await this.refreshFromRemote(row);
  }

  private async refreshFromRemote(row: number): Promise<void> {
    this.isLoading.set(true);
    try {
      const response = await firstValueFrom(this.apiService.getDomainSheets(row));

      if (response && response.status === 'success' && Array.isArray(response.data?.sheets)) {
        const normalized: DomainSheet[] = response.data.sheets.map((sheet) => ({
          row,
          name: sheet.name,
          index: sheet.index,
          rows: sheet.rows,
        }));

        await this.dbService.db.transaction('rw', this.dbService.db.domainSheets, async () => {
          await this.dbService.db.domainSheets.where('row').equals(row).delete();
          await this.dbService.db.domainSheets.bulkPut(normalized);
        });

        if (this.loadedRow === row) {
          this.sheets.set(sortByIndex(normalized));
        }
      } else {
        throw new Error(response?.message || 'Malformed domain sheets response.');
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
