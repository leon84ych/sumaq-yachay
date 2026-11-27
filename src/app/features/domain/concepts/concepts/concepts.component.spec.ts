import { AllDomainWriteSyncService } from '../../shared/domain-repository/all-domain-write-sync.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { GlobalLoadingService } from '../../../../core/services/loading/global-loading.service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { StudySearchService } from '../../../../core/services/search/study-search.service';
import { LocalDBService, PendingDomainWrite } from '../../../../shared/local-db/local-db.service';
import { ConceptRecord } from '../model/concepts-model';
import { ConceptDataService } from '../services/concepts.service';
import { ConceptsComponent } from './concepts.component';

const concept = (id: string, overrides: Partial<ConceptRecord> = {}): ConceptRecord => ({
  id,
  bookId: 'book-1',
  bookRow: 7,
  itemRow: Number(id.replace(/\D/g, '')) + 1,
  term: `Term ${id}`,
  definition: `Definition ${id}`,
  category: '',
  source: 'Book One',
  tags: ['#memory'],
  syncStatus: 'synced',
  contributor: 'admin@example.com',
  feed: 5,
  ...overrides,
});

describe('ConceptsComponent', () => {
  const dataService = {
    getBookRecord: vi.fn(),
    getRecords: vi.fn(),
    getAllowedTags: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  const showError = vi.fn();
  let fixture: ComponentFixture<ConceptsComponent>;
  let component: ConceptsComponent;

  async function create(rows: ConceptRecord[]): Promise<void> {
    dataService.getRecords.mockResolvedValue(rows);
    TestBed.inject(PermissionService).setRole('admin');
    fixture = TestBed.createComponent(ConceptsComponent);
    fixture.componentRef.setInput('bookId', 'book-1');
    component = fixture.componentInstance;
    await component.ngOnInit();
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.resetAllMocks();
    dataService.getBookRecord.mockResolvedValue({
      id: 'book-1',
      row: 7,
      name: 'Book One',
      author: 'Author One',
    });
    dataService.getAllowedTags.mockResolvedValue(['#memory']);

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        { provide: ConceptDataService, useValue: dataService },

        {
          provide: AllDomainWriteSyncService,
          useValue: {
            resolveId: (_domain: string, _book: string, id: string) => id,
            watchRecords: () => ({ unsubscribe: vi.fn() }),
            watchWrites: () => ({ unsubscribe: vi.fn() }),
            save: (_domain: string, record: unknown, isEdit: boolean) =>
              isEdit ? dataService.updateDomainItem(record) : dataService.addDomainItem(record),
            delete: async (_domain: string, record: unknown) => {
              await dataService.deleteDomainItem(record);
              return 'deleted';
            },
          },
        },

        { provide: GlobalMessageService, useValue: { showError } },
        {
          provide: LocalDBService,
          useValue: {
            indexedDB: { tags: { where: () => ({ equals: () => ({ toArray: async () => [] }) }) } },
          },
        },
      ],
    });
  });

  it('loads the book context and renders cards, filtering through the shared search query', async () => {
    await create([concept('c1'), concept('c2', { term: 'Something else', tags: [] })]);

    expect(component.bookName()).toBe('Book One');
    expect(component.bookRow()).toBe(7);
    expect(fixture.nativeElement.querySelectorAll('app-concept-entry-card')).toHaveLength(2);

    const search = TestBed.inject(StudySearchService).query;
    search.set('something');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['c2']);

    search.set('#memory');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['c1']);

    search.set('memory');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['c1']);

    search.set('nothing matches');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-concept-entry-card')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.concept-search')).not.toBeNull();
  });

  it('creates a concept with bookRow, itemRow 0, category, source and normalized tags', async () => {
    await create([]);
    const saved = concept('gas-1', { itemRow: 0 });
    dataService.addDomainItem.mockResolvedValue(saved);

    component.newTerm.set('  New term  ');
    component.newDefinition.set(' A definition ');
    component.newCategory.set('other');
    component.customCategory.set(' Custom ');
    component.newTags.set(['Memory']);
    await component.saveConcept();

    expect(dataService.updateDomainItem).not.toHaveBeenCalled();
    expect(dataService.addDomainItem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringMatching(/^book-1_CONCEPTS_\d+$/),
        bookId: 'book-1',
        bookRow: 7,
        itemRow: 0,
        term: 'New term',
        definition: 'A definition',
        category: 'Custom',
        source: 'Book One',
        tags: ['#memory'],
        feed: 5,
        syncStatus: 'pending',
      }),
    );
    expect(component.rows()).toEqual([saved]);
    expect(component.newTerm()).toBe('');
  });

  it('closes the form before background synchronization completes and shows its result', async () => {
    let updateRows!: (records: ConceptRecord[]) => void;
    let finishSync!: (record: ConceptRecord) => void;
    const response = new Promise<ConceptRecord>((resolve) => {
      finishSync = resolve;
    });
    TestBed.overrideProvider(AllDomainWriteSyncService, {
      useValue: {
        watchRecords: (_domain: string, _book: string, update: typeof updateRows) => {
          updateRows = update;
          return { unsubscribe: vi.fn() };
        },
        watchWrites: () => ({ unsubscribe: vi.fn() }),
        save: (_domain: string, record: ConceptRecord) => {
          void response.then((synced) => updateRows([synced]));
          return Promise.resolve(record);
        },
      },
    });
    await create([]);
    component.newTerm.set('Term');
    component.newDefinition.set('Definition');

    await component.saveConcept();

    expect(component.newTerm()).toBe('');
    expect(component.rows()[0].syncStatus).toBe('pending');
    expect(TestBed.inject(GlobalLoadingService).isLoading()).toBe(false);
    finishSync({ ...component.rows()[0], id: 'server-id', syncStatus: 'synced' });
    await vi.waitFor(() => expect(component.rows()[0].syncStatus).toBe('synced'));
    expect(component.rows()[0].id).toBe('server-id');
  });

  it('disables editing and deletion while a deletion is waiting to synchronize', async () => {
    const row = concept('c1', { syncStatus: 'pending' });
    TestBed.overrideProvider(AllDomainWriteSyncService, {
      useValue: {
        watchRecords: () => ({ unsubscribe: vi.fn() }),
        watchWrites: (_domain: string, _book: string, update: (writes: PendingDomainWrite[]) => void) => {
          update([{
            domain: 'CONCEPTS', bookId: row.bookId, id: row.id, record: row,
            operation: 'delete', state: 'uncertain', revision: 1,
          }]);
          return { unsubscribe: vi.fn() };
        },
      },
    });
    await create([row]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.domain-edit-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.domain-delete-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-domain-sync-controls button')).not.toBeNull();
    component.editEntry(row);
    expect(component.editingId()).toBeNull();
  });

  it('updates the original record keeping itemRow, contributor and feed when editing', async () => {
    const original = concept('c1', { itemRow: 15, category: 'Custom', feed: 3 });
    await create([original]);
    const updated = { ...original, term: 'Edited' };
    dataService.updateDomainItem.mockResolvedValue(updated);

    component.editEntry(original);
    expect(component.newCategory()).toBe('other');
    expect(component.customCategory()).toBe('Custom');
    component.newTerm.set('Edited');
    await component.saveConcept();

    expect(dataService.addDomainItem).not.toHaveBeenCalled();
    expect(dataService.updateDomainItem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'c1',
        bookRow: 7,
        itemRow: 15,
        contributor: 'admin@example.com',
        category: 'Custom',
        feed: 3,
        term: 'Edited',
      }),
    );
    expect(component.rows()).toEqual([updated]);
    expect(component.editingId()).toBeNull();
  });

  it('rejects tags outside the book taxonomy', async () => {
    await create([]);

    component.newTerm.set('A term');
    component.newDefinition.set('A definition');
    component.newTags.set(['#unlisted']);

    expect(component.invalidTagsDetected()).toEqual(['#unlisted']);
    expect(component.isFormInvalid()).toBe(true);
    await component.saveConcept();
    expect(dataService.addDomainItem).not.toHaveBeenCalled();
  });

  it('requires a term and a definition', async () => {
    await create([]);

    component.newTerm.set('A term');
    expect(component.isFormInvalid()).toBe(true);
    component.newDefinition.set('A definition');
    expect(component.isFormInvalid()).toBe(false);
  });

  it('keeps the form state and shows an error when saving fails', async () => {
    await create([]);
    dataService.addDomainItem.mockRejectedValue(new Error('GAS failed'));

    component.newTerm.set('A term');
    component.newDefinition.set('A definition');
    await component.saveConcept();

    expect(showError).toHaveBeenCalledWith('GAS failed');
    expect(component.rows()).toEqual([]);
    expect(component.newTerm()).toBe('A term');
  });

  it('deletes the complete record after confirmation and removes it only on success', async () => {
    const row = concept('c1', { itemRow: 15 });
    await create([row, concept('c2')]);
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );

    dataService.deleteDomainItem.mockRejectedValueOnce(new Error('GAS failed'));
    await component.deleteEntry('c1');
    expect(component.rows()).toHaveLength(2);

    dataService.deleteDomainItem.mockResolvedValueOnce(undefined);
    await component.deleteEntry('c1');
    expect(dataService.deleteDomainItem).toHaveBeenLastCalledWith(row);
    expect(component.rows().map((item) => item.id)).toEqual(['c2']);
    vi.unstubAllGlobals();
  });

  it('does not delete when the confirmation is declined', async () => {
    await create([concept('c1')]);
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    );

    await component.deleteEntry('c1');

    expect(dataService.deleteDomainItem).not.toHaveBeenCalled();
    expect(component.rows()).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});
