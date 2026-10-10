import { describe, expect, it, vi } from 'vitest';
import { AppDbService } from './app-db.service';

describe('AppDbService', () => {
  it('clears every table within one read-write transaction', async () => {
    const clear = vi.fn().mockResolvedValue(0);
    const tables = [{ clear }, { clear }, { clear }];
    const transaction = vi.fn(
      async (_mode: string, _tables: unknown[], operation: () => Promise<void>) => operation(),
    );
    const service = Object.create(AppDbService.prototype) as AppDbService;
    Object.defineProperty(service, 'db', {
      value: { tables, transaction },
    });

    await service.clearAllTables();

    expect(transaction).toHaveBeenCalledOnce();
    expect(transaction).toHaveBeenCalledWith('rw', tables, expect.any(Function));
    expect(clear).toHaveBeenCalledTimes(tables.length);
  });
});