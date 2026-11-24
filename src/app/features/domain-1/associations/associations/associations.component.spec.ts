import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalErrorService } from '../../../../core/services/error/global-error.service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { StudySearchService } from '../../../../core/services/search/study-search.service';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { ConceptRecord } from '../../concepts/model/concepts-model';
import { AssociationRecord } from '../model/associations-model';
import { AssociationDataService } from '../services/associations.service';
import { AssociationsComponent } from './associations.component';

const concept = (id: string, term: string): ConceptRecord => ({
  id,
  bookId: 'book-1',
  bookRow: 8,
  itemRow: Number(id.replace(/\D/g, '')) + 1,
  term,
  definition: `${term} definition`,
  category: 'other',
  source: '',
  tags: [],
  feed: 5,
  contributor: '',
  syncStatus: 'synced',
});

const association = (
  id: string,
  overrides: Partial<AssociationRecord> = {},
): AssociationRecord => ({
  id,
  bookId: 'book-1',
  bookRow: 8,
  itemRow: Number(id.replace(/\D/g, '')) + 1,
  sourceConceptId: 'concept-1',
  targetConceptId: 'concept-2',
  relationType: 'causes',
  directed: true,
  description: 'One idea leads to another.',
  color: '#735D78',
  book: 'Book One',
  author: 'Author One',
  page: '18',
  tags: ['#causality'],
  feed: 5,
  contributor: 'reader@example.com',
  syncStatus: 'synced',
  ...overrides,
});

describe('AssociationsComponent', () => {
  const dataService = {
    getBookRecord: vi.fn(),
    getRecords: vi.fn(),
    getConcepts: vi.fn(),
    getAllowedTags: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  const showError = vi.fn();
  let fixture: ComponentFixture<AssociationsComponent>;
  let component: AssociationsComponent;

  async function create(rows: AssociationRecord[]): Promise<void> {
    dataService.getRecords.mockResolvedValue(rows);
    fixture = TestBed.createComponent(AssociationsComponent);
    fixture.componentRef.setInput('bookId', 'book-1');
    component = fixture.componentInstance;
    await component.ngOnInit();
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.resetAllMocks();
    dataService.getBookRecord.mockResolvedValue({
      id: 'book-1',
      row: 8,
      name: 'Book One',
      author: 'Author One',
    });
    dataService.getConcepts.mockResolvedValue([
      concept('concept-1', 'Reason'),
      concept('concept-2', 'Causality'),
    ]);
    dataService.getAllowedTags.mockResolvedValue(['#causality']);

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        { provide: AssociationDataService, useValue: dataService },
        { provide: GlobalErrorService, useValue: { show: showError } },
        {
          provide: LocalDBService,
          useValue: {
            indexedDB: { tags: { where: () => ({ equals: () => ({ toArray: async () => [] }) }) } },
          },
        },
      ],
    });
    TestBed.inject(StudySearchService).query.set('');
    TestBed.inject(PermissionService).setRole('admin');
  });

  it('filters associations using concept terms and both tag query forms', async () => {
    await create([
      association('a1'),
      association('a2', {
        targetConceptId: 'other-concept',
        description: 'Something else',
        tags: [],
      }),
    ]);

    TestBed.inject(StudySearchService).query.set('reason');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['a1', 'a2']);
    TestBed.inject(StudySearchService).query.set('#causality');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['a1']);
    TestBed.inject(StudySearchService).query.set('causality');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['a1']);
  });

  it('rejects invalid endpoints and self-associations', async () => {
    await create([]);
    component.newSourceConceptId.set('concept-1');
    component.newTargetConceptId.set('concept-1');
    component.newRelationType.set('related to');
    component.newDescription.set('A conceptual relationship.');
    expect(component.isFormInvalid()).toBe(true);

    component.newTargetConceptId.set('unknown-concept');
    expect(component.isFormInvalid()).toBe(true);
  });

  it('creates a normalized association with concept IDs and book row metadata', async () => {
    await create([]);
    const saved = association('gas-1', { itemRow: 0, contributor: '' });
    dataService.addDomainItem.mockResolvedValue(saved);
    component.newSourceConceptId.set('concept-1');
    component.newTargetConceptId.set('concept-2');
    component.newRelationType.set(' causes ');
    component.newDescription.set(' One idea leads to another. ');
    component.newTags.set(['Causality']);

    await component.saveAssociation();

    expect(dataService.updateDomainItem).not.toHaveBeenCalled();
    expect(dataService.addDomainItem).toHaveBeenCalledWith(
      expect.objectContaining({
        bookId: 'book-1',
        bookRow: 8,
        itemRow: 0,
        sourceConceptId: 'concept-1',
        targetConceptId: 'concept-2',
        relationType: 'causes',
        description: 'One idea leads to another.',
        tags: ['#causality'],
        syncStatus: 'pending',
      }),
    );
    expect(component.rows()).toEqual([saved]);
  });

  it('updates the original association and retains its row and contributor metadata', async () => {
    const original = association('a1', { itemRow: 24 });
    await create([original]);
    const updated = { ...original, directed: false };
    dataService.updateDomainItem.mockResolvedValue(updated);
    component.editEntry(original);
    component.newDirected.set(false);

    await component.saveAssociation();

    expect(dataService.addDomainItem).not.toHaveBeenCalled();
    expect(dataService.updateDomainItem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'a1',
        bookRow: 8,
        itemRow: 24,
        contributor: 'reader@example.com',
        directed: false,
      }),
    );
    expect(component.rows()).toEqual([updated]);
  });

  it('deletes locally only after confirmed remote success', async () => {
    const row = association('a1', { itemRow: 24 });
    await create([row, association('a2')]);
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    dataService.deleteDomainItem.mockRejectedValueOnce(new Error('GAS failed'));
    await component.deleteEntry('a1');
    expect(component.rows()).toHaveLength(2);

    dataService.deleteDomainItem.mockResolvedValueOnce(undefined);
    await component.deleteEntry('a1');
    expect(dataService.deleteDomainItem).toHaveBeenLastCalledWith(row);
    expect(component.rows().map((item) => item.id)).toEqual(['a2']);
    vi.unstubAllGlobals();
  });
});
