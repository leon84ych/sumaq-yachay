import { computed, inject, Injectable, signal } from '@angular/core';
import { DomainInfo, DomainSheet } from '../models/domain-sheet.model';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { GlobalErrorService } from '../../../../core/services/error/global-error.service';
import { BookGASRepository } from '../../../book/services/book-gas-repository';
import { BookRecord } from '../../../book/models/book-item.model';
import { IndexRecord } from '../../index/model/index-model';
import { IndexRepository } from '../../index/services/index-repository';
import { TagPickerService } from '../../../../shared/tag-picker/tag-picker.service';




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


  readonly domainsInfo = signal<DomainInfo[]>([]);
  readonly domainsNames = computed(() => this.domainsInfo().filter(domain => domain.id != 'ID').map((domain) => domain.id));


  readonly bookInfo = signal<BookRecord | null>(null);


  private indexGasRepository = inject(IndexRepository);

  /**
   * Loads the sheet (tab) names of the Domain Data owned by a Book row
   */
  async loadForCatalog(row: number): Promise<void> {
    this.sheets.set([]);
    this.isLoading.set(true);
    try {
      const response = await this.bookGASRepository.getSource(row);
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
    }
  }

  createDomainSheet(domainName: string, headers: string[]): Promise<void> {
    this.isLoading.set(true);
    throw new Error('Not implemented yet');
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
