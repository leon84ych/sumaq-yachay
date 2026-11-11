
import { CatalogRecord } from "../../../features/domain-1/catalog/models/catalog-item.model";
import { SyncStatus } from "../../../features/domain-1/shared/model/domain-shared-model";
import { CatalogRaw, CatalogRowValues } from "./gas-model.model";


//-----------------CATALOG MAPPERS---------------------------

/**
 * 
 * @param item The catalog record to be converted to a raw format
 * @returns The raw catalog data suitable for GAS API
 */
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


/**
 * 
 * @param raw The raw catalog data from GAS API
 * @returns The catalog record converted from raw data
 */
export function getCatalogRecord(raw: CatalogRaw): CatalogRecord {
    return {
        id: raw.id,
        subject: raw.subject,
        topic: raw.topic,
        name: raw.name,
        author: raw.author,
        description: raw.description,
        source: raw.source,
        active: raw.active,
        page: raw.page,
        pages: raw.pages,
        updatedAt: raw.updatedAt,
        count: raw.count,
        syncStatus: parseSyncStatus(raw.syncStatus),
        row: raw.row
    };
}

/**
 * 
 * @param value retrieved value for Status
 * @returns Valid status or pending if none 
 */
function parseSyncStatus(value: unknown): SyncStatus {
  const validStatuses: SyncStatus[] = ['synced', 'pending', 'error'];
  return validStatuses.includes(value as SyncStatus) 
    ? (value as SyncStatus) 
    : 'pending'; // Valor por defecto en caso de que llegue vacío o inválido
}




//-----------------CATALOG ITEM MAPPERS---------------------------

export function getCatalogRowValues(item: CatalogRecord): CatalogRowValues {
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
