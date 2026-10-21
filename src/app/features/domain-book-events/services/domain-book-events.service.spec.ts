import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import jasmineCore from 'jasmine-core';
import { AppDbService } from '../../../core/services/storage/app-db.service';
import { TaxonomyService } from '../../../core/services/taxonomy/taxonomy.service';
import { DomainBookEventsService } from './domain-book-events.service';

const jasmine = jasmineCore.jasmine;

describe('DomainBookEventsService', () => {
  let mockTaxonomyService: jasmine.SpyObj<TaxonomyService>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockTaxonomyService = jasmine.createSpyObj<TaxonomyService>('TaxonomyService', [
      'filterAllowedTags',
    ]);
    TestBed.configureTestingModule({
      providers: [
        DomainBookEventsService,
        { provide: AppDbService, useValue: { db: {} } as unknown as AppDbService },
        { provide: TaxonomyService, useValue: mockTaxonomyService },
      ],
    });
  });

  it('filters event tags through the shared INDEX taxonomy', () => {
    const incomingTags = ['#war', '#unknown'];
    const allowedTags = ['#war'];
    mockTaxonomyService.filterAllowedTags.and.returnValue(allowedTags);

    const result = TestBed.inject(DomainBookEventsService).validateAndSanitizeTags(incomingTags);

    expect(mockTaxonomyService.filterAllowedTags.calls.argsFor(0)).toEqual([incomingTags]);
    expect(result).toEqual(allowedTags);
    expect(result).not.toContain('#unknown');
  });
});