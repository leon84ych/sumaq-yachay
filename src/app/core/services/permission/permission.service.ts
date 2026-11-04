import { Injectable, signal } from '@angular/core';

export type UserRole = 'admin' | 'user' | 'guest';

const OPERATION_ROLE_MAP = new Map<string, readonly UserRole[]>([
  ['GET_CATALOG', ['user', 'admin', 'guest']],
  ['GET_SHEETS_NAMES', ['user', 'admin', 'guest']],
  ['GET_PAGINATED_ROWS', ['user', 'admin', 'guest']],
  ['GET_CATALOG_HEALTH', ['user', 'admin', 'guest']],
  ['CREATE_CATALOG_ITEM', ['admin']],
  ['CLONE_CATALOG_ITEM', ['admin']],
  ['UPDATE_CATALOG_ITEM', ['admin']],
  ['DELETE_CATALOG_ITEM', ['admin']],
  ['CREATE_SHEET', ['admin']],
  ['UPDATE_SHEET_ROWS', ['admin']],
  ['DELETE_ROW', ['admin']],
]);

const USER_ROLES = new Set<UserRole>(['admin', 'user', 'guest']);

@Injectable({ providedIn: 'root' })
export class PermissionService {
  readonly role = signal<UserRole>('guest');

  setRole(role: unknown): void {
    const normalizedRole = typeof role === 'string' ? role.toLowerCase() : '';
    this.role.set(USER_ROLES.has(normalizedRole as UserRole) ? (normalizedRole as UserRole) : 'guest');
  }

  validatePermission(role: string, operation: string): boolean {
    const allowedRoles = OPERATION_ROLE_MAP.get(operation.toUpperCase());
    return allowedRoles?.includes(role.toLowerCase() as UserRole) ?? false;
  }
}