import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import jasmineCore from 'jasmine-core';
import { AppDbService } from '../../../core/services/storage/app-db.service';
import { CharacterRecord } from '../models/domain-character-row.model';
import { TaxonomyService } from '../../../core/services/taxonomy/taxonomy.service';
import { DomainCharacterService } from './domain-character.service';

const jasmine = jasmineCore.jasmine;

describe('DomainCharacterService', () => {
  let mockTaxonomyService: jasmine.SpyObj<TaxonomyService>;
  let persistedCharacters: CharacterRecord[];

  beforeEach(() => {
    persistedCharacters = [];
    mockTaxonomyService = jasmine.createSpyObj<TaxonomyService>('TaxonomyService', [
      'filterAllowedTags',
    ]);

    const characterTable = {
      where: () => ({
        equals: () => ({ delete: async () => undefined }),
      }),
      bulkPut: async (rows: Character[]) => {
        persistedCharacters = rows;
      },
    };
    const database = {
      characters: characterTable,
      transaction: async (
        _mode: string,
        _table: unknown,
        operation: () => Promise<void>,
      ) => operation(),
    };

    TestBed.configureTestingModule({
      providers: [
        DomainCharacterService,
        { provide: AppDbService, useValue: { db: database } as unknown as AppDbService },
        { provide: TaxonomyService, useValue: mockTaxonomyService },
      ],
    });
  });

  it('should pass through only tags whitelisted by the Taxonomy Service', () => {
    const incomingTags = ['#valid', '#unauthorized'];
    const allowedTags = ['#valid'];
    mockTaxonomyService.filterAllowedTags.and.returnValue(allowedTags);

    const result = TestBed.inject(DomainCharacterService).validateAndSanitizeTags(incomingTags);

    expect(mockTaxonomyService.filterAllowedTags.calls.argsFor(0)).toEqual([incomingTags]);
    expect(result).toEqual(allowedTags);
    expect(result).not.toContain('#unauthorized');
  });

  it('persists the character color selected in the form', async () => {
    mockTaxonomyService.filterAllowedTags.and.returnValue(['#identity']);
    const character: Character & Record<string, unknown> = {
      id: 'character-1',
      row: 2,
      tags: ['#identity'],
      name: 'Sample character',
      role: 'protagonist',
      color: '#77C0AD',
      feed: 1,
      contributor: 'Local Sample Data',
      syncStatus: 'pending',
    };

    await TestBed.inject(DomainCharacterService).syncRemoteRows(2, [character]);

    expect(persistedCharacters[0].color).toBe('#77C0AD');
  });
});
