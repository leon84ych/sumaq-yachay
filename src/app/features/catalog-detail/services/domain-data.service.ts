import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppDbService } from '../../../core/services/storage/app-db.service';
import { DomainDataApiService } from './domain-data-api.service';
import { DomainSheet } from '../models/domain-sheet.model';

@Injectable({
  providedIn: 'root',
})
export class DomainDataService {
  private dbService = inject(AppDbService);
  private apiService = inject(DomainDataApiService);

  readonly sheets = signal<DomainSheet[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  private loadedCatalogId: string | null = null;

  readonly sheetNames = computed(() => this.sheets().map((sheet) => sheet.name));

  /**
   * Cache-first load for one Catalog entry's Domain Data Sheets, then refreshes in the background.
   */
  async loadForCatalog(catalogId: string): Promise<void> {
    this.loadedCatalogId = catalogId;
    this.errorMessage.set(null);

    const cached = await this.dbService.db.domainSheets.where('catalogId').equals(catalogId).toArray();
    if (this.loadedCatalogId === catalogId) {
      this.sheets.set(cached);
    }

    await this.refreshFromRemote(catalogId);
  }

  private async refreshFromRemote(catalogId: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const response = await firstValueFrom(this.apiService.getDomainSheets(catalogId));
      if (response && response.status === 'success' && Array.isArray(response.sheets)) {
        const normalized: DomainSheet[] = response.sheets.map((sheet) => ({
          catalogId,
          name: sheet.name,
          rows: sheet.rows,
        }));

        await this.dbService.db.transaction('rw', this.dbService.db.domainSheets, async () => {
          await this.dbService.db.domainSheets.where('catalogId').equals(catalogId).delete();
          await this.dbService.db.domainSheets.bulkPut(normalized);
        });

        if (this.loadedCatalogId === catalogId) {
          this.sheets.set(normalized);
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
