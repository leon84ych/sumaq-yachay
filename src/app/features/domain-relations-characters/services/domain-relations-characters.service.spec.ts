import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import jasmineCore from 'jasmine-core';
import { AppDbService } from '../../../core/services/storage/app-db.service';
import { TaxonomyService } from '../../../core/services/taxonomy/taxonomy.service';
import { DomainRelationsCharactersService } from './domain-relations-characters.service';

const jasmine = jasmineCore.jasmine;

describe('DomainRelationsCharactersService', () => {
  let mockTaxonomyService: jasmine.SpyObj<TaxonomyService>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockTaxonomyService = jasmine.createSpyObj<TaxonomyService>('TaxonomyService', [
      'filterAllowedTags',
    ]);
    TestBed.configureTestingModule({
      providers: [
        DomainRelationsCharactersService,
        { provide: AppDbService, useValue: { db: {} } as unknown as AppDbService },
        { provide: TaxonomyService, useValue: mockTaxonomyService },
      ],
    });
  });

  it('filters relationship tags through the shared INDEX taxonomy', () => {
    const incomingTags = ['#family', '#unknown'];
    const allowedTags = ['#family'];
    mockTaxonomyService.filterAllowedTags.and.returnValue(allowedTags);

    const result = TestBed.inject(DomainRelationsCharactersService).validateAndSanitizeTags(
      incomingTags,
    );

    expect(mockTaxonomyService.filterAllowedTags.calls.argsFor(0)).toEqual([incomingTags]);
    expect(result).toEqual(allowedTags);
    expect(result).not.toContain('#unknown');
  });
});
