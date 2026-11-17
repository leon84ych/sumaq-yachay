

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

export interface Domain extends Record<string, unknown> {
    id: string;             //unique identifier for the domain sheet
    bookId: string;         //stores the book ID associated with this domain sheet
    tags: string[];         //list of tags associated with this domain sheet
    contributor: string;    //stores the contributor of this domain sheet
    syncStatus: SyncStatus; //indicates the synchronization status of this domain sheet
    row: number;            //row number of this domain sheet in the source data
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
export interface Response<T> {
    status: Status;
    message: string;
    email: string;
    role: Role;
    data: T;
}


export interface PaginatedResponse<T> {
    domain: string;
    page: number;
    pageSize: number;
    totalRows: number;
    totalPages: number;
    rows: T[];
}

