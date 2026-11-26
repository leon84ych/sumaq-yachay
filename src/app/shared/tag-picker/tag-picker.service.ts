import { inject, Injectable } from "@angular/core";
import { LocalDBService } from "../local-db/local-db.service";
import { normalizeTagsFromArray } from "./tag-picker.mapper";
import { BookRecord } from "../../features/catalog/book/models/book-item.model";


@Injectable({
    providedIn: 'root',
})
export class TagPickerService {


    private readonly dbService = inject(LocalDBService);

    extractAndNormalizeTags(tags: string[]): string[] {
        return normalizeTagsFromArray(tags);
    }

    /**
     * 
     * @param bookId id of the book to load all tags
     * @returns void 
     */
    async loadBookTagsByBookId(bookId: string): Promise<void> {
        // Load tags for the specified book ID from the local database
        const indexes = await this.dbService.indexedDB.indexes.where('bookId').equals(bookId).toArray();
        const tags = indexes.map(index => index.tags.flat()).flat();
        console.log("tags length:", tags.length);
        const bookRecord = await this.dbService.indexedDB.books.where('id').equals(bookId).first();

        if (!bookRecord) {
            throw new Error(`Book with ID ${bookId} not found`);
        } else {
            return this.upsertBookTags(tags, bookRecord);
        }
    }

    async loadBookTagsByRow(row: number): Promise<void> {
        const bookRecord = await this.dbService.indexedDB.books.where('row').equals(row).first();
        if (!bookRecord) {
            throw new Error(`Book with row ${row} not found`);
        }
        return this.loadBookTagsByBookId(bookRecord.id);
    }


    async upsertBookTags(tags: string[], book: BookRecord): Promise<void> {
        const normalizedTags = [...new Set(this.extractAndNormalizeTags(tags))];
        if (normalizedTags.length === 0) {
            return;
        }

        const table = this.dbService.indexedDB.tags;
        await this.dbService.indexedDB.transaction('rw', table, async () => {
            for (const tag of normalizedTags) {
                const id = `${book.row}_${tag}`;
                const existing = await table.get(id);
                await table.put({
                    ...existing,
                    id,
                    bookId: book.id,
                    row: book.row,
                    book: book.name,
                    ...((book.author ?? existing?.author)
                        ? { author: book.author ?? existing?.author }
                        : {}),
                    ...((book.subject ?? existing?.subject)
                        ? { subject: book.subject ?? existing?.subject }
                        : {}),
                    ...((book.topic ?? existing?.topic)
                        ? { topic: book.topic ?? existing?.topic }
                        : {}),
                    name: tag,
                    usageCount: (existing?.usageCount ?? 0) + 1,
                });
            }
        });
    }
}