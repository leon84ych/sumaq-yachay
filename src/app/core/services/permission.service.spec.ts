import { describe, expect, it } from 'vitest';
import { PermissionService } from './permission.service';

describe('PermissionService', () => {
  it('defaults to guest and permits read operations', () => {
    const service = new PermissionService();

    expect(service.role()).toBe('guest');
    expect(service.validatePermission(service.role(), 'GET_CATALOG')).toBe(true);
    expect(service.validatePermission(service.role(), 'GET_PAGINATED_ROWS')).toBe(true);
    expect(service.validatePermission(service.role(), 'UPDATE_SHEET_ROWS')).toBe(false);
    expect(service.validatePermission(service.role(), 'CLONE_CATALOG_ITEM')).toBe(false);
  });

  it('allows admin to perform catalog, sheet, and row writes', () => {
    const service = new PermissionService();
    service.setRole('admin');

    expect(service.validatePermission(service.role(), 'CREATE_CATALOG_ITEM')).toBe(true);
    expect(service.validatePermission(service.role(), 'CLONE_CATALOG_ITEM')).toBe(true);
    expect(service.validatePermission(service.role(), 'UPDATE_CATALOG_ITEM')).toBe(true);
    expect(service.validatePermission(service.role(), 'CREATE_SHEET')).toBe(true);
    expect(service.validatePermission(service.role(), 'UPDATE_SHEET_ROWS')).toBe(true);
    expect(service.validatePermission(service.role(), 'DELETE_ROW')).toBe(true);
    expect(service.validatePermission(service.role(), 'DELETE_CATALOG_ITEM')).toBe(true);
  });

  it('allows user to read but not write', () => {
    const service = new PermissionService();
    service.setRole('user');

    expect(service.validatePermission(service.role(), 'GET_SHEETS_NAMES')).toBe(true);
    expect(service.validatePermission(service.role(), 'CREATE_CATALOG_ITEM')).toBe(false);
    expect(service.validatePermission(service.role(), 'CLONE_CATALOG_ITEM')).toBe(false);
    expect(service.validatePermission(service.role(), 'UPDATE_SHEET_ROWS')).toBe(false);
    expect(service.validatePermission(service.role(), 'DELETE_ROW')).toBe(false);
  });

  it('falls back to guest for an unknown backend role or operation', () => {
    const service = new PermissionService();
    service.setRole('owner');

    expect(service.role()).toBe('guest');
    expect(service.validatePermission(service.role(), 'UNKNOWN_OPERATION')).toBe(false);
  });
});