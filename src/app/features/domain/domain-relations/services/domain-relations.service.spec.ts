import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import jasmineCore from 'jasmine-core';
import { AppDbService } from '../../../../core/services/storage/app-db.service';
import { TaxonomyService } from '../../../../core/services/taxonomy/taxonomy.service';
import { DomainRelationsService } from './domain-relations.service';

const jasmine = jasmineCore.jasmine;

describe('DomainRelationsService', () => {
  let mockTaxonomyService: jasmine.SpyObj<TaxonomyService>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockTaxonomyService = jasmine.createSpyObj<TaxonomyService>('TaxonomyService', [
      'filterAllowedTags',
    ]);
    TestBed.configureTestingModule({
      providers: [
        DomainRelationsService,
        { provide: AppDbService, useValue: { db: {} } as unknown as AppDbService },
        { provide: TaxonomyService, useValue: mockTaxonomyService },
      ],
    });
  });

  it('filters relationship tags through the shared INDEX taxonomy', () => {
    const incomingTags = ['#family', '#unknown'];
    const allowedTags = ['#family'];
    mockTaxonomyService.filterAllowedTags.and.returnValue(allowedTags);

    const result = TestBed.inject(DomainRelationsService).validateAndSanitizeTags(
      incomingTags,
    );

    expect(mockTaxonomyService.filterAllowedTags.calls.argsFor(0)).toEqual([incomingTags]);
    expect(result).toEqual(allowedTags);
    expect(result).not.toContain('#unknown');
  });
});
