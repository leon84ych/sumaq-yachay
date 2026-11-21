
import { inject, Injectable } from '@angular/core';
import { IndexRepository } from './index-repository';
import { IndexRecord } from '../model/index-model';
import { IndexQueryService } from './index-query.service';
import { BookQueryService } from './book-query.service';


@Injectable({
    providedIn: 'root',
})
export class IndexDataService {

    private indexGasRepository = inject(IndexRepository);
    private bookQueryService = inject(BookQueryService);
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
            const book = await this.bookQueryService.getBookRecord(bookId);
            if (!book?.row) {
                throw new Error('Book record is missing row.');
            }
            return this.indexGasRepository.getDomain(book?.row);
        }
    }

    async getBookRecord(bookId: string) {
        return this.bookQueryService.getBookRecord(bookId);
    }

    async addDomainItem(record: IndexRecord): Promise<IndexRecord> {
        return this.indexGasRepository.addDomainItem(record);
    }


}
