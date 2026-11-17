import { Injectable } from "@angular/core";
import { GASMapperInterface } from "../../../core/infrastructure/gas/gas-mapper-interface";
import { CatalogRaw, CatalogRawValues, CatalogRecord } from "./catalog-item.model";
import { parseSyncStatus } from "../../../core/infrastructure/gas/gas-utils-mappers.mapper";

@Injectable({ providedIn: 'root' })
export class CatalogGASMapper implements GASMapperInterface<CatalogRecord, CatalogRaw, CatalogRawValues> {

    toRecord(raw: CatalogRaw): CatalogRecord {
        return {
            ...raw,
            syncStatus: parseSyncStatus(raw.syncStatus),
        }
    }

    toRaw(record: CatalogRecord): CatalogRaw {
        return {
            ...record
        };
    }

    toRowValues(item: CatalogRecord): CatalogRawValues {
        // Genera el arreglo posicional exacto para las columnas de Google Sheets
        return [
            item.id,
            item.subject || '',
            item.topic || '',
            item.name || '',
            item.author || '',
            item.description || '',
            item.source || 'PDF',
            item.active ?? true,
            item.page ?? 0,
            item.pages ?? 0,
            item.updatedAt || new Date().toISOString(),
            item.count ?? 0,
            item.syncStatus || 'pending',
        ];
    }
    
}