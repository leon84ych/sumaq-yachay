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
    throw new Error(`Unexpected book response status: ${status}`);
}

export function mapRole(role: string): Role {
    if (role === Role.ADMIN || role === Role.USER || role === Role.GUEST) {
        return role;
    }
    throw new Error(`Unexpected book response role: ${role}`);
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

