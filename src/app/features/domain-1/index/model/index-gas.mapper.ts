import { Injectable } from "@angular/core";

import { IndexRaw, IndexRawValues, IndexRecord } from "./index-model";
import { mapTagsToArray, mapTagsToString, parseSyncStatus } from "../../../../core/infrastructure/gas/gas-utils-mappers.mapper";
import { GASMapperInterface } from "../../../../core/infrastructure/gas/gas-mapper-interface";


@Injectable({
    providedIn: 'root',
})
export class IndexGASMapper implements GASMapperInterface<IndexRecord, IndexRaw, IndexRawValues> {


    toRecord(raw: IndexRaw): IndexRecord {
        return {
            ...raw,
            tags: mapTagsToArray(raw.tags),
            syncStatus: parseSyncStatus(raw.syncStatus),
        };
    }

    toRaw(record: IndexRecord): IndexRaw {
        return {
            ...record,
            tags: mapTagsToString(record.tags),
            syncStatus: record.syncStatus,
        };
    }


    toRowValues(item: IndexRecord): IndexRawValues {
        // Genera el arreglo posicional exacto para las columnas de Google Sheets
        return [
            item.id,
            item.chapter,
            item.theme,
            item.subtheme,
            mapTagsToString(item.tags),
            item.feed,
            item.contributor,
            item.syncStatus,
        ];
    }

}