import { computed, inject, Injectable, signal } from '@angular/core';
import { DomainInfo, DomainSheet } from '../models/domain-sheet.model';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { GlobalErrorService } from '../../../../core/services/error/global-error.service';
import { CatalogGASRepository } from '../../../catalog/services/catalog-gas-repository';
import { CatalogRecord } from '../../../catalog/models/catalog-item.model';
import { IndexRecord } from '../../index/model/index-model';
import { IndexRepository } from '../../index/services/index-repository';




@Injectable({
  providedIn: 'root',
})
export class DomainDataService {


  readonly isLoading = signal<boolean>(false);

  readonly sheets = signal<DomainSheet<Record<string, unknown>>[]>([]);

  readonly sheetNames = computed(() => this.sheets().filter(sheet => sheet.name != 'ID').map((sheet) => sheet.name));

  private catalogGASRepository = inject(CatalogGASRepository);
  private localDBService = inject(LocalDBService);
  private globalErrorService = inject(GlobalErrorService);


  readonly domainsInfo = signal<DomainInfo[]>([]);
  readonly domainsNames = computed(() => this.domainsInfo().filter(domain => domain.id != 'ID').map((domain) => domain.id));


  readonly bookInfo = signal<CatalogRecord | null>(null);
  readonly index = signal<IndexRecord[] | null>(null);

  private indexGasRepository = inject(IndexRepository);

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
      console.log("Retrieve domains called");
      this.retrieveDomains(row);
    }
  } 

  createDomainSheet(domainName: string, headers: string[]): Promise<void> {
    this.isLoading.set(true);
    throw new Error('Not implemented yet');
  }

  retrieveDomains(row: number){
      this.domainsInfo().forEach(domain => {0
        if(domain.id==="INDEX"){
          console.log("Found INDEX domain:", domain);
          this.indexGasRepository.getDomain(row, domain.count); 
        }
      });
  }

}
