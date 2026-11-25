
import { inject, Injectable } from '@angular/core';
import { IndexRepository } from './index-repository';
import { IndexRecord } from '../model/index-model';
import { IndexQueryService } from './index-query.service';
import { BookQueryService } from './book-query.service';
import { TagPickerService } from '../../../../shared/tag-picker/tag-picker.service';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { TranslocoService } from '@jsverse/transloco';
import { GoogleAuthService } from '../../../authentication/services/google-auth-service';


@Injectable({
    providedIn: 'root',
})
export class IndexDataService {

    private indexGasRepository = inject(IndexRepository);
    private bookQueryService = inject(BookQueryService);
    private indexQueryService = inject(IndexQueryService);
    private tagPickerService = inject(TagPickerService);
    private globalMessageService = inject(GlobalMessageService);
    private transloco = inject(TranslocoService);
    private googleAuthService = inject(GoogleAuthService);

    /**
     * Returns locally stored index records for a book, or fetches them from GAS if none are stored.
     * @param bookId The ID of the book whose index records to retrieve.
     * @returns The book's index records.
     */
    async getRecords(
        bookId: string,
        onRemoteUpdate?: (records: IndexRecord[]) => void,
    ): Promise<IndexRecord[]> {
        const indexes = await this.indexQueryService.getIndicesByBookRow(bookId);
        const book = await this.bookQueryService.getBookRecord(bookId);
        if (!this.googleAuthService.idToken()) {
            this.globalMessageService.showInfo(this.transloco.translate('DOMAINS.INDEX.LOCAL_ONLY'));
            return indexes;
        }
        if (!book?.row) {
            if (indexes.length > 0) return indexes;
            throw new Error('Book record is missing row.');
        }

        if (indexes.length > 0) {
            this.globalMessageService.showInfo(this.transloco.translate('DOMAINS.INDEX.REFRESHING'));
            void this.refreshFromRemote(bookId, book.row, indexes, onRemoteUpdate);
            return indexes;
        }

        this.globalMessageService.showInfo(this.transloco.translate('DOMAINS.INDEX.REFRESHING'));
        try {
            const records = await this.indexGasRepository.getDomain(book.row);
            this.globalMessageService.showSuccess(this.transloco.translate('DOMAINS.INDEX.REFRESHED'));
            return records;
        } catch (error) {
            this.globalMessageService.showError(this.errorMessage(error));
            throw error;
        }
    }

    async getBookRecord(bookId: string) {
        return this.bookQueryService.getBookRecord(bookId);
    }

    async addDomainItem(record: IndexRecord): Promise<IndexRecord> {
        const savedRecord = await this.indexGasRepository.addDomainItem(record);
        await this.persistTags(savedRecord);
        return savedRecord;
    }

    async updateDomainItem(record: IndexRecord): Promise<IndexRecord> {
        const savedRecord = await this.indexGasRepository.updateDomainItem(record);
        await this.persistTags(savedRecord);
        return savedRecord;
    }

    async deleteDomainItem(record: IndexRecord): Promise<void> {
        return this.indexGasRepository.deleteDomainItem(record);
    }

    private async refreshFromRemote(
        bookId: string,
        bookRow: number,
        localRecords: IndexRecord[],
        onRemoteUpdate?: (records: IndexRecord[]) => void,
    ): Promise<void> {
        try {
            const remoteRecords = await this.indexGasRepository.getDomain(bookRow);
            if (!this.recordsEqual(localRecords, remoteRecords)) {
                onRemoteUpdate?.(remoteRecords);
                this.globalMessageService.showSuccess(this.transloco.translate('DOMAINS.INDEX.UPDATED'));
            } else {
                this.globalMessageService.showInfo(this.transloco.translate('DOMAINS.INDEX.UP_TO_DATE'));
            }
        } catch (error) {
            this.globalMessageService.showError(this.errorMessage(error));
        }
    }

    private recordsEqual(left: IndexRecord[], right: IndexRecord[]): boolean {
        const normalize = (records: IndexRecord[]) => records
            .map((record) => JSON.stringify(record))
            .sort();
        return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
    }

    private errorMessage(error: unknown): string {
        return error instanceof Error ? error.message : 'Failed to refresh index data.';
    }

    private async persistTags(record: IndexRecord): Promise<void> {
        const book = await this.bookQueryService.getBookRecord(record.bookId);
        if (book) {
            await this.tagPickerService.upsertBookTags(record.tags, book);
        }
    }


}
