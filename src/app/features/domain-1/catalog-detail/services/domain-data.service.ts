import { computed, inject, Injectable, signal } from '@angular/core';
import { DomainSheet } from '../models/domain-sheet.model';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { GlobalErrorService } from '../../../../core/services/error/global-error.service';
import { DomainGASRepository } from '../../../../core/infrastructure/gas/domain-gas-repository';




@Injectable({
  providedIn: 'root',
})
export class DomainDataService {


  readonly isLoading = signal<boolean>(false);
  readonly sheets = signal<DomainSheet[]>([]);
  readonly sheetNames = computed(() => this.sheets().filter(sheet => sheet.name != 'ID').map((sheet) => sheet.name));

  private catalogGASRepository = inject(DomainGASRepository);
  private localDBService = inject(LocalDBService);
  private globalErrorService = inject(GlobalErrorService);


  /**
   * Loads the sheet (tab) names of the Domain Data owned by a Catalog row
   */
  async loadForCatalog(row: number): Promise<void> {
    this.sheets.set([]);
    this.isLoading.set(true);
    try {
      const response = await this.catalogGASRepository.getSource(row);
      if (response.status !== 'success' || !Array.isArray(response.data?.sheets)) {
        throw new Error(response.message || 'Failed to load domain sheets.');
      }
      this.sheets.set(
        response.data.sheets.map((sheet) => ({
          row,
          id: sheet.name.toLowerCase(),
          name: sheet.name,
          index: sheet.index,
          rows: sheet.rows ?? [],
        })),
      );
    } catch (error: unknown) {
      this.globalErrorService.show(
        error instanceof Error ? error.message : 'Failed to load domain sheets.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  createDomainSheet(domainName: string, headers: string[]): Promise<void> {
    this.isLoading.set(true);
    throw new Error('Not implemented yet');
  }

}
