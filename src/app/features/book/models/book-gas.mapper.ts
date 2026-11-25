import { Injectable } from "@angular/core";
import { GASMapperInterface } from "../../../core/infrastructure/gas/gas-mapper-interface";
import { BookRaw, BookRawValues, BookRecord } from "./book-item.model";
import { parseSyncStatus } from "../../../core/infrastructure/gas/gas-utils-mappers.mapper";

@Injectable({ providedIn: 'root' })
export class BookGASMapper implements GASMapperInterface<BookRecord, BookRaw, BookRawValues> {

    toRecord(raw: BookRaw): BookRecord {
        return {
            ...raw,
            syncStatus: parseSyncStatus(raw.syncStatus),
        }
    }

    toRaw(record: BookRecord): BookRaw {
        return {
            ...record
        };
    }

    toRowValues(item: BookRecord): BookRawValues {
        // Genera el arreglo posicional exacto para las columnas de Google Sheets
        return [
            item.id,
            item.isbn || '',
            item.subject || '',
            item.topic || '',
            item.name || '',
            item.author || '',
            item.language || '',
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