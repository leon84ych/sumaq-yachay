import { inject, Injectable } from "@angular/core";
import { BookRepositoryInterface } from "../../../core/infrastructure/book-repository-interface";
import { GASBookAPI } from "../../../core/infrastructure/gas/gas-book-api.service";
import { mapRole, mapStatus, parseResponseRole, parseResponseStatus, parseSyncStatus } from "../../../core/infrastructure/gas/gas-utils-mappers.mapper";

import { Response, PaginatedResponse } from "../../domain-1/shared/model/domain-shared-model";

import { BookRaw, BookRawValues, BookRecord } from "../models/book-item.model";
import { BookInfo } from "../../domain-1/book-detail/models/domain-sheet.model";
import { BookGASMapper } from "../models/book-gas.mapper";



@Injectable({
    providedIn: 'root',
})
export class BookGASRepository implements BookRepositoryInterface<BookRecord> {

    //convertir en clase abstracta para obligar el contrato contra las interfaces 
    private api = inject(GASBookAPI<BookRaw, BookRawValues>);
    private mapper = inject(BookGASMapper);

    async getHealth(): Promise<string> {
        try {
            return await this.api.getHealth();
        } catch (error) {
            console.error('Failed to get health:', error);
            throw error;
        }
    }

    async getBooks(page: number, pageSize: number): Promise<Response<PaginatedResponse<BookRecord>>> {
        try {
            const bookResponse = await this.api.getBooks(page, pageSize);

            const data = bookResponse.data.rows.map((row: BookRaw) => this.mapper.toRecord(row));

            const response: Response<PaginatedResponse<BookRecord>> = {
                ...bookResponse,
                status: mapStatus(bookResponse.status),
                role: mapRole(bookResponse.role),
                data: {
                    ...bookResponse.data,
                    rows: data,
                    domain: bookResponse.data.sheetName
                },
            };
            return response;

        } catch (error) {
            console.error('Failed to load books:', error);
            throw error;
        }
    }

    async createItem(item: BookRecord): Promise<Response<BookRecord>> {
        try {
            const createResponse = await this.api.saveBook(item.id,item.row, this.mapper.toRaw(item));

            const response: Response<BookRecord> = {
                ...createResponse,
                status: mapStatus(createResponse.status),
                role: mapRole(createResponse.role),
                data: this.mapper.toRecord(createResponse.data),
            };
            return response;
        } catch (error) {
            console.error('Failed to save book item:', error);
            throw error;
        }

    }


    async updateItem(item: BookRecord): Promise<Response<BookRecord>> {
        return this.createItem(item);
    }

    async cloneBook(sheetUrl: string): Promise<Response<unknown>> {
        try {
            const cloneResponse = await this.api.cloneBook(sheetUrl);

            return {
                ...cloneResponse,
                status: mapStatus(cloneResponse.status),
                role: mapRole(cloneResponse.role),
            };
        } catch (error) {
            console.error('Failed to clone book:', error);
            throw error;
        }
    }

    async cloneBookItem(sheetUrl: string): Promise<Response<BookRecord>> {
        try {
            const cloneResponse = await this.api.cloneBookItem(sheetUrl);

            const response: Response<BookRecord> = {
                ...cloneResponse,
                status: mapStatus(cloneResponse.status),
                role: mapRole(cloneResponse.role),
                data: this.mapper.toRecord(cloneResponse.data),
            };
            return response;
        } catch (error) {
            console.error('Failed to clone book item:', error);
            throw error;
        }
    }

    async deleteItem(item: BookRecord): Promise<Response<string>> {
        try {
            const deleteResponse = await this.api.deleteBookItem(item.row, item.id);

            return {
                ...deleteResponse,
                status: mapStatus(deleteResponse.status),
                role: mapRole(deleteResponse.role),
            };
        } catch (error) {
            console.error('Failed to delete book item:', error);
            throw error;
        }
    }

    getBookItem(id: string): Promise<unknown> {
        throw new Error("Method not implemented.");
    }


    /**
     * Retrieves the book info for the specified row.
     * @param row The row number of the book info to retrieve
     * @returns A promise that resolves to the book info response containing the book info data for the specified row
     */
    async getSource(row: number): Promise<Response<BookInfo>> {

        const bookInfoResponse = await this.api.getBookInfo(row);

        const bookInfo: Response<BookInfo> = {
            ...bookInfoResponse,
            status: parseResponseStatus(bookInfoResponse.status),
            role: parseResponseRole(bookInfoResponse.role),
            data: {
                id: this.mapper.toRecord(bookInfoResponse.data.id),
                domains: bookInfoResponse.data.sheets
            }
        }
        return bookInfo;
    }

   
}

