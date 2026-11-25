import { computed, inject, Injectable, signal } from '@angular/core';
import { DomainInfo, DomainSheet } from '../models/domain-sheet.model';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { GlobalErrorService } from '../../../../core/services/error/global-error.service';
import { BookGASRepository } from '../../../book/services/book-gas-repository';
import { BookRecord } from '../../../book/models/book-item.model';
import { IndexRecord } from '../../index/model/index-model';
import { IndexRepository } from '../../index/services/index-repository';
import { TagPickerService } from '../../../../shared/tag-picker/tag-picker.service';
import { GASDomainAPI } from '../../../../core/infrastructure/gas/gas-domain-api.service';
import { GlobalLoadingService } from '../../../../core/services/loading/global-loading.service';




@Injectable({
  providedIn: 'root',
})
export class DomainDataService {


  readonly isLoading = signal<boolean>(false);

  readonly sheets = signal<DomainSheet<Record<string, unknown>>[]>([]);

  readonly sheetNames = computed(() => this.sheets().filter(sheet => sheet.name != 'ID').map((sheet) => sheet.name));

  private bookGASRepository = inject(BookGASRepository);
  private globalErrorService = inject(GlobalErrorService);
  private tagPickerService = inject(TagPickerService);
  private indexGasRepository = inject(IndexRepository);
  private gasDomainAPI = inject(GASDomainAPI<Record<string, unknown>, unknown>);
  private globalLoadingService = inject(GlobalLoadingService);

  readonly domainsInfo = signal<DomainInfo[]>([]);
  readonly domainsNames = computed(() => this.domainsInfo().filter(domain => domain.id != 'ID').map((domain) => domain.id));

  readonly bookInfo = signal<BookRecord | null>(null);


  /**
   * Loads the sheet (tab) names of the Domain Data owned by a Book row
   */
  async loadForCatalog(row: number): Promise<void> {
    this.sheets.set([]);
    this.isLoading.set(true);
    const operation = this.globalLoadingService.begin();
    try {
      const response = await this.bookGASRepository.getBookInfo(row);
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
      await this.retrieveDomains(row);

    } catch (error: unknown) {
      this.globalErrorService.show(
        error instanceof Error ? error.message : 'Failed to load domain sheets.',
      );
    } finally {
      this.isLoading.set(false);
      this.globalLoadingService.end(operation);
    }
  }

  async createDomain(row: number, domainName: string, headers: string[]): Promise<void> {
    console.log('Creating domain for row:', row);
    if(row  < 2 ){
      throw new Error('Invalid row number.');
    }
    this.isLoading.set(true);
    try {
      const response = await this.gasDomainAPI.createDomain(row, domainName, headers);
      if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to create domain sheet.');
      }

      const createdSheet = response.data?.createdSheet?.trim();
      if (!createdSheet) {
        throw new Error('The server did not return the created domain sheet name.');
      }

      this.domainsInfo.update((domains) => {
        if (domains.some((domain) => domain.id === createdSheet)) {
          return domains;
        }

        const index = Math.max(-1, ...domains.map((domain) => domain.index)) + 1;
        return [...domains, { id: createdSheet, index, count: 0 }];
      });
    } finally {
      this.isLoading.set(false);
    }

  }

  async retrieveDomains(row: number): Promise<void> {
    for (const domain of this.domainsInfo()) {
      if (domain.id === "INDEX") {
        await this.indexGasRepository.getDomain(row, domain.count);
        await this.tagPickerService.loadBookTagsByRow(row);
      }
    }
  }

}
