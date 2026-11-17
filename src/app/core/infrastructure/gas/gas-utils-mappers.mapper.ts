import { Response, Role, Status, SyncStatus } from "../../../features/domain-1/shared/model/domain-shared-model";
import { GASResponseRaw } from "./gas-model.model";


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


export function mapStatus(status: string): Status {
    if (status === Status.SUCCESS || status === Status.ERROR) {
        return status;
    }
    throw new Error(`Unexpected catalog response status: ${status}`);
}

export function mapRole(role: string): Role {
    if (role === Role.ADMIN || role === Role.USER || role === Role.GUEST) {
        return role;
    }
    throw new Error(`Unexpected catalog response role: ${role}`);
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