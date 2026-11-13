import { DomainRepositoryInterface } from "../domain-repository-intreface";
import { inject, Injectable } from "@angular/core";
import { getCatalogRecord, getIndexRecord, parseResponseRole, parseResponseStatus } from "./gas-mapper.mapper";
import { GASDomainAPI } from "./gas-domain-api.service";
import { BookInfo } from "../../../features/domain-1/catalog-detail/models/domain-sheet.model";
import { Response } from "../../../features/domain-1/shared/model/domain-shared-model";


@Injectable({
    providedIn: 'root',
})
export class DomainGASRepository<T> implements DomainRepositoryInterface<T> {


    private gasDomainApi = inject(GASDomainAPI);

    async getSource(row: number): Promise<Response<BookInfo>> {

        const bookInfoResponse = await this.gasDomainApi.getBookInfo(row);

        const indexRecords = Array.isArray(bookInfoResponse.data.index)
            ? bookInfoResponse.data.index.map(getIndexRecord)
            : [];

        const bookInfo : Response<BookInfo> = {
            ...bookInfoResponse,
            status : parseResponseStatus(bookInfoResponse.status),
            role : parseResponseRole(bookInfoResponse.role),
            data: {
                id: getCatalogRecord(bookInfoResponse.data.id),
                index: indexRecords,
                domains: bookInfoResponse.data.sheets
            }
        }
    
        return bookInfo;
    }

    getDomain(): Promise<T[]> {
        throw new Error("Method not implemented.");
    }

    getDomainPaginated(page: number, pageSize: number): Promise<T[]> {
        throw new Error("Method not implemented.");
    }

    addDomainItem(id: string): Promise<T> {
        throw new Error("Method not implemented.");
    }

    updateDomainItem(id: string): Promise<T> {
        throw new Error("Method not implemented.");
    }

    deleteDomainItem(id: string): Promise<void> {
        throw new Error("Method not implemented.");
    }



}