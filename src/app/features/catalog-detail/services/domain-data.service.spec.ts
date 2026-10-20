import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, Subject, throwError } from 'rxjs';
import { AppDbService } from '../../../core/services/storage/app-db.service';
import { TaxonomyService } from '../../../core/services/taxonomy/taxonomy.service';
import { GlobalLoadingService } from '../../../core/services/global-loading.service';
import { ConfigService } from '../../../core/services/config.service';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';
import { DomainDataApiService } from './domain-data-api.service';
import { DomainDataService, sortByIndex } from './domain-data.service';
import { DomainCharacterService } from '../../domain-character/services/domain-character.service';
import { DomainConceptsService } from '../../domain-concepts/services/domain-concepts.service';
import { DomainQuotesService } from '../../domain-quotes/services/domain-quotes.service';
import { DomainPassagesService } from '../../domain-passages/services/domain-passages.service';
import { DomainPlacesService } from '../../domain-places/services/domain-places.service';
import { DomainGlosaryService } from '../../domain-glosary/services/domain-glosary.service';
import { DomainQuestionsService } from '../../domain-questions/services/domain-questions.service';
import { DomainIndexService } from '../../domain-index/services/domain-index.service';

describe('DomainDataService.deleteDomainRow', () => {
  let service: DomainDataService;
  let deleteRowSpy: ReturnType<typeof vi.fn>;
  let updateRowsSpy: ReturnType<typeof vi.fn>;
  let globalLoadingService: GlobalLoadingService;
  let persistedRows: Record<string, unknown>[];
  let persistedBookTags: Record<string, unknown>[];
  let localSampleDataEnabled: boolean;

  beforeEach(() => {
    persistedRows = [
      { id: 'concept-1', row: 4, tag: '#first', tags: '#first', syncStatus: 'synced' },
      { id: 'concept-2', row: 4, tag: '#second', tags: '#second', syncStatus: 'synced' },
    ];
    persistedBookTags = [];
    localSampleDataEnabled = false;
    deleteRowSpy = vi.fn();
    updateRowsSpy = vi.fn();
    globalLoadingService = new GlobalLoadingService();

    const table = {
      where: vi.fn(() => ({
        equals: vi.fn((row: number) => ({
          delete: vi.fn(async () => {
            const previousLength = persistedRows.length;
            persistedRows = persistedRows.filter((record) => Number(record['row']) !== row);
            return previousLength - persistedRows.length;
          }),
          filter: vi.fn((predicate: (record: Record<string, unknown>) => boolean) => ({
            delete: vi.fn(async () => {
              const previousLength = persistedRows.length;
              persistedRows = persistedRows.filter(
                (record) => Number(record['row']) !== row || !predicate(record),
              );
              return previousLength - persistedRows.length;
            }),
          })),
        })),
      })),
      put: vi.fn(async (record: Record<string, unknown>) => {
        persistedRows.push(record);
      }),
      bulkPut: vi.fn(async (records: Record<string, unknown>[]) => {
        persistedRows = records;
      }),
    };
    const bookTagsTable = {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          delete: vi.fn(async () => {
            persistedBookTags = [];
          }),
        })),
      })),
      bulkPut: vi.fn(async (records: Record<string, unknown>[]) => {
        persistedBookTags.push(...records);
      }),
    };
    const database = {
      concepts: table,
      bookTags: bookTagsTable,
      catalogs: {
        toArray: vi.fn(async () => [
          { row: 4, id: 'catalog-item-4', name: 'Book 4', author: 'Author 4' },
        ]),
      },
      domainSheets: { put: vi.fn(async () => undefined) },
      transaction: vi.fn(
        async (_mode: unknown, _tables: unknown, operation: () => Promise<void>) => operation(),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        DomainDataService,
        { provide: AppDbService, useValue: { db: database } as unknown as AppDbService },
        {
          provide: DomainDataApiService,
          useValue: { deleteRow: deleteRowSpy, updateRows: updateRowsSpy },
        },
        { provide: GoogleAuthService, useValue: {} },
        { provide: GlobalLoadingService, useValue: globalLoadingService },
        {
          provide: ConfigService,
          useValue: { isLocalSampleDataEnabled: () => localSampleDataEnabled },
        },
        { provide: TaxonomyService, useValue: { refreshGlobalTaxonomy: vi.fn() } },
        { provide: DomainCharacterService, useValue: {} },
        {
          provide: DomainConceptsService,
          useValue: {
            name: 'CONCEPTS',
            syncRemoteRows: vi.fn(async (_row: number, rows: Record<string, unknown>[]) => {
              persistedRows = rows;
            }),
          },
        },
        { provide: DomainQuotesService, useValue: {} },
        { provide: DomainPassagesService, useValue: {} },
        { provide: DomainPlacesService, useValue: {} },
        { provide: DomainGlosaryService, useValue: {} },
        { provide: DomainQuestionsService, useValue: {} },
        { provide: DomainIndexService, useValue: {} },
      ],
    });

    service = TestBed.inject(DomainDataService);
    service['loadedRow'] = 4;
    service.sheets.set([
      {
        row: 4,
        id: 'concepts',
        name: 'CONCEPTS',
        index: 0,
        rows: [
          { id: 'concept-1', tag: '#first', tags: '#first', syncStatus: 'synced' },
          { id: 'concept-2', tag: '#second', tags: '#second', syncStatus: 'synced' },
        ],
      },
    ]);
  });

  it('removes the row locally and sends its identity to GAS', async () => {
    deleteRowSpy.mockReturnValue(of({ status: 'success' }));

    await service.deleteDomainRow('CONCEPTS', 'concept-1');

    expect(service.sheets()[0].rows.map((record) => record['id'])).toEqual(['concept-2']);
    expect(persistedRows.map((record) => record['id'])).toEqual(['concept-2']);
    expect(deleteRowSpy).toHaveBeenCalledWith(4, 'CONCEPTS', 'concept-1', 'catalog-item-4');
  });

  it('keeps the loading overlay active until GAS responds', async () => {
    const response = new Subject<unknown>();
    deleteRowSpy.mockReturnValue(response);

    const deletePromise = service.deleteDomainRow('CONCEPTS', 'concept-1');
    await vi.waitFor(() => expect(deleteRowSpy).toHaveBeenCalled());

    expect(globalLoadingService.isLoading()).toBe(true);
    response.next({ status: 'success' });
    response.complete();
    await deletePromise;

    expect(globalLoadingService.isLoading()).toBe(false);
  });

  it('restores the row and book tags when the GAS request fails', async () => {
    deleteRowSpy.mockReturnValue(throwError(() => new Error('GAS unavailable')));

    await expect(service.deleteDomainRow('CONCEPTS', 'concept-1')).rejects.toThrow('GAS unavailable');

    expect(service.sheets()[0].rows.map((record) => record['id'])).toEqual([
      'concept-1',
      'concept-2',
    ]);
    expect(persistedRows.map((record) => record['id'])).toEqual(['concept-2', 'concept-1']);
    expect(persistedBookTags.map((record) => record['tag'])).toEqual(['#first', '#second']);
  });

  it('sends only the edited row while preserving the other local rows', async () => {
    updateRowsSpy.mockReturnValue(of({ status: 'success' }));
    const editedRow = {
      id: 'concept-1',
      term: 'Updated term',
      tag: '#first',
      tags: '#first',
      syncStatus: 'pending',
    };

    await service.updateDomainSheetRows(
      'CONCEPTS',
      [editedRow, { id: 'concept-2', tag: '#second', tags: '#second', syncStatus: 'synced' }],
      true,
      'concept-1',
    );

    expect(updateRowsSpy).toHaveBeenCalledWith(
      4,
      'CONCEPTS',
      [editedRow],
      'catalog-item-4',
      false,
    );
    expect(persistedRows.map((record) => record['id'])).toEqual(['concept-1', 'concept-2']);
  });

  it('sends only a new row and replaces its local id with the GAS-assigned id', async () => {
    updateRowsSpy.mockReturnValue(of({ status: 'success', createdRowId: 'gas-concept-3' }));
    const newRow = {
      id: 'temporary-concept-3',
      term: 'New concept',
      tag: '#new',
      tags: '#new',
      syncStatus: 'pending',
    };

    await service.updateDomainSheetRows(
      'CONCEPTS',
      [
        { id: 'concept-1', tag: '#first', tags: '#first', syncStatus: 'synced' },
        { id: 'concept-2', tag: '#second', tags: '#second', syncStatus: 'synced' },
        newRow,
      ],
      true,
      undefined,
      newRow.id,
    );

    const sentRows = updateRowsSpy.mock.calls[0][2] as Record<string, unknown>[];
    expect(sentRows).toHaveLength(1);
    expect(sentRows[0]['id']).toBe('temporary-concept-3');
    expect(service.sheets()[0].rows.map((record) => record['id'])).toEqual([
      'concept-1',
      'concept-2',
      'gas-concept-3',
    ]);
    expect(persistedRows.map((record) => record['id'])).toEqual([
      'concept-1',
      'concept-2',
      'gas-concept-3',
    ]);
  });

  it('normalizes INDEX rows to tag without the plural tags field', () => {
    const normalized = service['normalizeRecordTags'](
      { id: 'index-1', tag: '#single', tags: '#duplicate' },
      'INDEX',
    );

    expect(normalized['tag']).toBe('#single');
    expect(normalized).not.toHaveProperty('tags');
  });

  it('keeps domain edits local in LocalSampleData mode', async () => {
    localSampleDataEnabled = true;
    const editedRow = {
      id: 'concept-1',
      term: 'Locally edited concept',
      tag: '#first',
      tags: '#first',
    };

    await service.updateDomainSheetRows(
      'CONCEPTS',
      [editedRow, { id: 'concept-2', tag: '#second', tags: '#second', syncStatus: 'synced' }],
    );

    expect(updateRowsSpy).not.toHaveBeenCalled();
    expect(persistedRows[0]).toMatchObject({ term: 'Locally edited concept', syncStatus: 'synced' });
  });

  it('deletes domain rows locally without calling the API in LocalSampleData mode', async () => {
    localSampleDataEnabled = true;

    await service.deleteDomainRow('CONCEPTS', 'concept-1');

    expect(deleteRowSpy).not.toHaveBeenCalled();
    expect(service.sheets()[0].rows.map((record) => record['id'])).toEqual(['concept-2']);
  });
});

describe('sortByIndex', () => {
  it('places populated INDEX sheets first while preserving other sheet order', () => {
    const sorted = sortByIndex([
      { row: 1, id: 'concepts', name: 'CONCEPTS', index: 0, rows: [{ id: 'concept-1' }] },
      { row: 1, id: 'index', name: 'INDEX', index: 4, rows: [{ id: 'index-1' }] },
      { row: 1, id: 'quotes', name: 'QUOTES', index: 2, rows: [{ id: 'quote-1' }] },
    ]);

    expect(sorted.map((sheet) => sheet.name)).toEqual(['INDEX', 'CONCEPTS', 'QUOTES']);
  });

  it('does not promote an empty INDEX sheet ahead of populated domains', () => {
    const sorted = sortByIndex([
      { row: 1, id: 'concepts', name: 'CONCEPTS', index: 0, rows: [{ id: 'concept-1' }] },
      { row: 1, id: 'index', name: 'INDEX', index: 4, rows: [] },
    ]);

    expect(sorted.map((sheet) => sheet.name)).toEqual(['CONCEPTS', 'INDEX']);
  });
});