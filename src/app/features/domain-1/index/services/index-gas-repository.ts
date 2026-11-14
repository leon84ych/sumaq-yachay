import { Injectable } from "@angular/core";
import { DomainGASRepository } from "../../../../core/infrastructure/gas/domain-gas-repository";
import { IndexRecord } from "../model/index-model";
import { mapTagsToArray, mapTagsToString, parseSyncStatus } from "../../../../core/infrastructure/gas/gas-mapper.mapper";
import { IndexRaw } from "../../../../core/infrastructure/gas/gas-model.model";


@Injectable({
    providedIn: 'root',
})
export class IndexGASRepository extends DomainGASRepository<IndexRecord, IndexRaw> {

    override domain: string = "INDEX";

    override getRecord(raw: IndexRaw): IndexRecord {
        return {
            ...raw,
            tags: mapTagsToArray(raw.tags),
            syncStatus: parseSyncStatus(raw.syncStatus),
        };
    }

    override getRaw(record: IndexRecord): IndexRaw {
        return {
            ...record,
            tags: mapTagsToString(record.tags),
            syncStatus: record.syncStatus,
        };
    }

}