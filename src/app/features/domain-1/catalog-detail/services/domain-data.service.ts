import { computed, inject, Injectable, signal } from '@angular/core';
import { DomainInfo, DomainSheet } from '../models/domain-sheet.model';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { GlobalErrorService } from '../../../../core/services/error/global-error.service';
import { DomainGASRepository } from '../../../../core/infrastructure/gas/domain-gas-repository';
import { CatalogRecord } from '../../../catalog/models/catalog-item.model';
import { IndexRecord } from '../../index/model/index-model';




@Injectable({
  providedIn: 'root',
})
export class DomainDataService {


  readonly isLoading = signal<boolean>(false);

  readonly sheets = signal<DomainSheet<Record<string, unknown>>[]>([]);

  readonly sheetNames = computed(() => this.sheets().filter(sheet => sheet.name != 'ID').map((sheet) => sheet.name));

  private catalogGASRepository = inject(DomainGASRepository);
  private localDBService = inject(LocalDBService);
  private globalErrorService = inject(GlobalErrorService);


  readonly domainsInfo = signal<DomainInfo[]>([]);
  readonly domainsNames = computed(() => this.domainsInfo().filter(domain => domain.id != 'ID').map((domain) => domain.id));


  readonly bookInfo = signal<CatalogRecord | null>(null);
  readonly index = signal<IndexRecord[] | null>(null);

  /**
   * Loads the sheet (tab) names of the Domain Data owned by a Catalog row
   */
  async loadForCatalog(row: number): Promise<void> {
    this.sheets.set([]);
    this.isLoading.set(true);
    try {
      const response = await this.catalogGASRepository.getSource(row);
      if (response.status !== 'success' || !Array.isArray(response.data?.domains)) {
        throw new Error(response.message || 'Failed to load domain sheets.');
      }

      this.bookInfo.set(response.data.id || null);

      //Save index records to the local database
      // Omit saving the catalog record as it is already managed elsewhere
      const database = this.localDBService.indexedDB;
      await database.transaction('rw', database.indexes, async () => {
        await database.indexes.bulkPut(response.data.index);
      });
      this.index.set(await database.indexes.where('row').equals(row).toArray());

      // Store each domain 
      this.domainsInfo.set(response.data.domains.map(sheet => ({
        id: sheet.id,
        index: sheet.index,
        count: sheet.count,
      })));


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
