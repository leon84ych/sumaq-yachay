import { inject, Injectable } from "@angular/core";
import { IndexRaw, IndexRecord } from "../model/index-model";
import { IndexGASMapper } from "../model/index-gas.mapper";
import { DomainRepositoryInterface } from "../../../../core/infrastructure/domain-repository-intreface";
import { IndexGASRepository } from "./index-gas-repository";
import { LocalDBService } from "../../../../shared/local-db/local-db.service";
import { GASPaginatedResponseRaw } from "../../../../core/infrastructure/gas/gas-model.model";




@Injectable({
  providedIn: 'root',
})
export class IndexRepository implements DomainRepositoryInterface<IndexRecord> {

  private mapper = inject(IndexGASMapper);
  private gasRepository = inject(IndexGASRepository);
  private localDBService = inject(LocalDBService);

  async getDomain(row: number, total: number | null = null): Promise<IndexRecord[]> {
    console.log("Fetching domain for row:", row, "with total:", total);
    const domain: IndexRaw[] = await this.gasRepository.getDomain(row, total);

    const domainRecords = domain.map(item => this.mapper.toRecord(item));

    //Save index records to the local database
    // Omit saving the catalog record as it is already managed elsewhere
    const database = this.localDBService.indexedDB;
    await database.transaction('rw', database.indexes, async () => {
      await database.indexes.bulkPut(domainRecords);
    });

    return domainRecords;
  }

  getDomainPaginated(row: number, page: number, pageSize: number): Promise<GASPaginatedResponseRaw<IndexRecord>> {
    throw new Error("Method not implemented.");
  }

  addDomainItem(id: string): Promise<IndexRecord> {
    throw new Error("Method not implemented.");
  }
  updateDomainItem(id: string): Promise<IndexRecord> {
    throw new Error("Method not implemented.");
  }

  deleteDomainItem(id: string): Promise<void> {
    throw new Error("Method not implemented.");
  }








}