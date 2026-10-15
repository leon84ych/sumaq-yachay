import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import jasmineCore from 'jasmine-core';
import { AppDbService } from '../../../core/services/storage/app-db.service';
import { TaxonomyService } from '../../../core/services/taxonomy/taxonomy.service';
import { DomainPassagesService } from './domain-passages.service';

const jasmine = jasmineCore.jasmine;

describe('DomainPassagesService', () => {
  let mockTaxonomyService: jasmine.SpyObj<TaxonomyService>;

  beforeEach(() => {
    mockTaxonomyService = jasmine.createSpyObj<TaxonomyService>('TaxonomyService', [
      'filterAllowedTags',
    ]);

    TestBed.configureTestingModule({
      providers: [
        DomainPassagesService,
        { provide: AppDbService, useValue: { db: {} } as unknown as AppDbService },
        { provide: TaxonomyService, useValue: mockTaxonomyService },
      ],
    });
  });

  it('should pass through only tags whitelisted by the Taxonomy Service', () => {
    const incomingTags = ['#valid', '#unauthorized'];
    const allowedTags = ['#valid'];
    mockTaxonomyService.filterAllowedTags.and.returnValue(allowedTags);

    const result = TestBed.inject(DomainPassagesService).validateAndSanitizeTags(incomingTags);

    expect(mockTaxonomyService.filterAllowedTags.calls.argsFor(0)).toEqual([incomingTags]);
    expect(result).toEqual(allowedTags);
    expect(result).not.toContain('#unauthorized');
  });
});
