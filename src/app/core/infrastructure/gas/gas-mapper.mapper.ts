
import { CatalogRecord } from "../../../features/catalog/models/catalog-item.model";
import { IndexRecord } from "../../../features/domain-1/index/model/index-model";
import { Response, Role, Status, SyncStatus } from "../../../features/domain-1/shared/model/domain-shared-model";
import { CatalogRaw, CatalogRawValues, GASResponseRaw, IndexRaw } from "./gas-model.model";


//-----------------RESPONSE MAPPERS---------------------------

export function getResponse(responseRaw: GASResponseRaw<any>):Response<any> {
  
  return {
    ...responseRaw,
    status: parseResponseStatus(responseRaw.status),
    role: parseResponseRole(responseRaw.role)
  } as Response<any>; 
}


/**
 * 
 * @param value The retrieved value for Role
 * @returns Valid role or guest if none 
 */
export function parseResponseRole(value: unknown): Role {
  const validRoles: Role[] = ['admin', 'user', 'guest'];
  return validRoles.includes(value as Role) 
    ? (value as Role) 
    : 'guest'; 
}


/**
 * 
 * @param value The retrieved value for Status
 * @returns Valid status or 'error' if none
 */
export function parseResponseStatus(value: unknown): Status {
  const validStatuses: Status[] = ['success', 'error'];
  return validStatuses.includes(value as Status) 
    ? (value as Status) 
    : 'error';
}



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
export function parseSyncStatus(value: unknown): SyncStatus {
  const validStatuses: SyncStatus[] = ['synced', 'pending', 'error'];
  return validStatuses.includes(value as SyncStatus) 
    ? (value as SyncStatus) 
    : 'pending';
}

//-----------------CATALOG ITEM MAPPERS---------------------------

export function getCatalogRowValues(item: CatalogRecord): CatalogRawValues {
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


//----------------- INDEX MAPPERS---------------------------

export function getIndexRaw(index: IndexRecord): IndexRaw {
    return {
        id: index.id,
        row: index.row,
        chapter: index.chapter,
        theme: index.theme,
        subtheme: index.subtheme,
        tags: mapTagsToString(index.tags),
        syncStatus: index.syncStatus,
        contributor: index.contributor,
        feed: index.feed,
    };
}

export function getIndexRecord(raw: IndexRaw): IndexRecord {
    return {
        id: raw.id,
        row: raw.row,
        chapter: raw.chapter,
        theme: raw.theme,
        subtheme: raw.subtheme,
        tags: mapTagsToArray(raw.tags),
        syncStatus: parseSyncStatus(raw.syncStatus),
        contributor: raw.contributor,
        feed: raw.feed,
    };
}


/**
 * 
 * @param rawTags Google Sheets tags format tag1|tag2|tag3
 * @returns Array of tags [tag1, tag2, tag3]
 */
export function mapTagsToArray(rawTags: string): string[] {
  if (!rawTags) return [];

  return rawTags
    .split('|')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}


/**
 * 
 * @param tags Array of tags [tag1, tag2, tag3]
 * @returns Google Sheets tags format tag1|tag2|tag3
 */
export function mapTagsToString(tags: string[]): string {
  if (!tags || tags.length === 0) return '';

  const cleaned = tags
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);

  if (cleaned.length === 0) return '';

  return  cleaned.join('|');
}



//----------------- INDEX MAPPERS---------------------------
