

export type SyncStatus = 'synced' | 'pending' | 'error';

export const SyncStatus = {
    SYNCED: 'synced' as const,
    PENDING: 'pending' as const,
    ERROR: 'error' as const,
} as const;



export type Status = 'success' | 'error';

export const Status = {
    SUCCESS: 'success' as const,
    ERROR: 'error' as const,
} as const;


export type Role = 'admin' | 'user' | 'guest';

export const Role = {
    ADMIN: 'admin' as const,
    USER: 'user' as const,
    GUEST: 'guest' as const,
} as const;

export interface DomainSheetRow extends Record<string, unknown> {
    id: string; // Row ID within the sheet
    tags: string; // String pipe separated hashtags, e.g. #tag1|#tag2|#tag3
    contributor: string; // User who contributed the row
    syncStatus: SyncStatus;
}


export interface BookTagRecord {
    id: string;
    scope?: 'book' | 'catalog';
    row?: number;
    book?: string;
    author?: string;
    subject?: string;
    topic?: string;
    name: string;
    domain?: string;
    usageCount?: number;
}

/**
 * Response wrapper to all request to the server
 */
export interface CatalogResponse<T> {
    status: Status;
    message: string;
    email: string;
    role: Role;
    data: T;
}


export interface PaginatedResponse<T> {
  sheetName: string;
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  rows: T[];
}

