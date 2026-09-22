import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readJson = (relativePath: string) =>
  JSON.parse(readFileSync(join(process.cwd(), relativePath), 'utf8'));

describe('Catalog sample data consistency', () => {
  it('keeps domain sheet catalog IDs aligned with catalog sample IDs', () => {
    const catalogResponse = readJson('public/sample-responses/get-catalog.sample.json');
    const domainResponse = readJson('public/sample-responses/get-domain-sheets.sample.json');

    const catalogItems = Array.isArray(catalogResponse?.data) ? catalogResponse.data : [];
    const domainEntries = Array.isArray(domainResponse) ? domainResponse : [];

    const catalogIds = new Set(
      catalogItems
        .map((item: { id?: string }) => item.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    );

    const domainIds = new Set(
      domainEntries
        .map((entry: { data?: { catalogId?: string } }) => entry?.data?.catalogId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    );

    expect(domainIds.size).toBe(catalogIds.size);
    expect([...catalogIds].every((id) => domainIds.has(id))).toBe(true);
    expect([...domainIds].every((id) => catalogIds.has(id))).toBe(true);
  });
});
