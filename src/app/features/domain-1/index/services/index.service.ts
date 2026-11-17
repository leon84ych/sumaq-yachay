
import { inject, Injectable } from '@angular/core';
import { IndexRepository } from './index-repository';
import { IndexRecord } from '../model/index-model';
import { IndexQueryService } from './index-query.service';
import { CatalogQueryService } from './catalog-query.service';


@Injectable({
    providedIn: 'root',
})
export class IndexDataService {

    private indexGasRepository = inject(IndexRepository);
    private catalogQueryService = inject(CatalogQueryService);
    private indexQueryService = inject(IndexQueryService);

    /**
     * Returns locally stored index records for a book, or fetches them from GAS if none are stored.
     * @param bookId The ID of the book whose index records to retrieve.
     * @returns The book's index records.
     */
    async getRecords(bookId: string): Promise<IndexRecord[]> {
        const indexes = await this.indexQueryService.getIndicesByBookRow(bookId);
        if (indexes.length > 0) {
            return indexes;
        } else {
            const catalog = await this.catalogQueryService.getCatalogRecord(bookId);
            if (!catalog?.row) {
                throw new Error('Catalog record is missing row.');
            }
            return this.indexGasRepository.getDomain(catalog?.row);
        }
    }

    async getCatalogRecord(bookId: string) {
        return this.catalogQueryService.getCatalogRecord(bookId);
    }


}
