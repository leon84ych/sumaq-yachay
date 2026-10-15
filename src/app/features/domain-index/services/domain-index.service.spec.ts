import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import jasmineCore from 'jasmine-core';
import { AppDbService } from '../../../core/services/storage/app-db.service';
import { TaxonomyService } from '../../../core/services/taxonomy/taxonomy.service';
import { DomainIndexService } from './domain-index.service';

const jasmine = jasmineCore.jasmine;

describe('DomainIndexService', () => {
  let mockTaxonomyService: jasmine.SpyObj<TaxonomyService>;
  let operationOrder: string[];
  let deleteSpy: jasmine.Spy;
  let bulkPutSpy: jasmine.Spy;

  beforeEach(() => {
    operationOrder = [];
    mockTaxonomyService = jasmine.createSpyObj<TaxonomyService>('TaxonomyService', [
      'refreshGlobalTaxonomy',
    ]);
    mockTaxonomyService.refreshGlobalTaxonomy.and.callFake(async () => {
      operationOrder.push('refresh');
    });

    deleteSpy = jasmine.createSpy('delete').and.callFake(async () => {
      operationOrder.push('delete');
      return 1;
    });
    const equalsSpy = jasmine.createSpy('equals').and.returnValue({ delete: deleteSpy });
    const whereSpy = jasmine.createSpy('where').and.returnValue({ equals: equalsSpy });
    bulkPutSpy = jasmine.createSpy('bulkPut').and.callFake(async () => {
      operationOrder.push('bulkPut');
    });
    const table = { where: whereSpy, bulkPut: bulkPutSpy };
    const transactionSpy = jasmine
      .createSpy('transaction')
      .and.callFake(async (_mode: unknown, _table: unknown, operation: () => Promise<void>) =>
        operation(),
      );

    TestBed.configureTestingModule({
      providers: [
        DomainIndexService,
        {
          provide: AppDbService,
          useValue: {
            db: { indexTopics: table, transaction: transactionSpy },
          } as unknown as AppDbService,
        },
        { provide: TaxonomyService, useValue: mockTaxonomyService },
      ],
    });
  });

  it('refreshes the global taxonomy after completing database bulk operations', async () => {
    const row = 42;

    await TestBed.inject(DomainIndexService).syncRemoteRows(row, []);

    expect(deleteSpy.calls.count()).toBe(1);
    expect(bulkPutSpy.calls.count()).toBe(1);
    expect(mockTaxonomyService.refreshGlobalTaxonomy.calls.argsFor(0)).toEqual([row]);
    expect(operationOrder).toEqual(['delete', 'bulkPut', 'refresh']);
  });
});
