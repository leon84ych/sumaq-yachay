
import { CatalogRecord } from "../../../features/domain-1/catalog/models/catalog-item.model";
import { SyncStatus } from "../../../features/domain-1/shared/model/domain-shared-model";
import { CatalogRaw } from "./gas-model.model";

export function getCatalogRow(item: CatalogRecord): CatalogRaw {    
    return {
        id: item.id,
        subject: item.subject,
        topic: item.topic,
        name: item.name,
        author: item.author,
        description: item.description,
        source: item.source,
        active: item.active,
        page: item.page,
        pages: item.pages,
        updatedAt: item.updatedAt,
        count: item.count,
        syncStatus: item.syncStatus,
        row: item.row
    };
}

export function getCatalogRecord(row: CatalogRaw): CatalogRecord {
    return {
        id: row.id,
        subject: row.subject,
        topic: row.topic,
        name: row.name,
        author: row.author,
        description: row.description,
        source: row.source,
        active: row.active,
        page: row.page,
        pages: row.pages,
        updatedAt: row.updatedAt,
        count: row.count,
        syncStatus: parseSyncStatus(row.syncStatus),
        row: row.row
    };
}

function parseSyncStatus(value: unknown): SyncStatus {
  const validStatuses: SyncStatus[] = ['synced', 'pending', 'error'];
  return validStatuses.includes(value as SyncStatus) 
    ? (value as SyncStatus) 
    : 'pending'; // Valor por defecto en caso de que llegue vacío o inválido
}