import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import jasmineCore from 'jasmine-core';
import { AppDbService } from '../../../core/services/storage/app-db.service';
import { TaxonomyService } from '../../../core/services/taxonomy/taxonomy.service';
import { DomainAssociationService } from './domain-association.service';

const jasmine = jasmineCore.jasmine;

describe('DomainAssociationService', () => {
  let mockTaxonomyService: jasmine.SpyObj<TaxonomyService>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockTaxonomyService = jasmine.createSpyObj<TaxonomyService>('TaxonomyService', [
      'filterAllowedTags',
    ]);
    TestBed.configureTestingModule({
      providers: [
        DomainAssociationService,
        { provide: AppDbService, useValue: { db: {} } as unknown as AppDbService },
        { provide: TaxonomyService, useValue: mockTaxonomyService },
      ],
    });
  });

  it('filters concept relation tags through the shared INDEX taxonomy', () => {
    const incomingTags = ['#theory', '#unknown'];
    const allowedTags = ['#theory'];
    mockTaxonomyService.filterAllowedTags.and.returnValue(allowedTags);

    const result = TestBed.inject(DomainAssociationService).validateAndSanitizeTags(
      incomingTags,
    );

    expect(mockTaxonomyService.filterAllowedTags.calls.argsFor(0)).toEqual([incomingTags]);
    expect(result).toEqual(allowedTags);
    expect(result).not.toContain('#unknown');
  });
});
