import { AllDomainWriteSyncService } from '../../shared/domain-repository/all-domain-write-sync.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { StudySearchService } from '../../../../core/services/search/study-search.service';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { PlaceRecord } from '../model/places-model';
import { PlaceDataService } from '../services/places.service';
import { PlacesComponent } from './places.component';

const place = (id: string, overrides: Partial<PlaceRecord> = {}): PlaceRecord => ({
  id,
  bookId: 'book-1',
  bookRow: 8,
  itemRow: Number(id.replace(/\D/g, '')) + 1,
  name: `Place ${id}`,
  type: 'city',
  nature: 'real',
  coordinates: '53.3498, -6.2603',
  color: '#26734d',
  tags: ['#setting'],
  feed: 5,
  contributor: 'reader@example.com',
  syncStatus: 'synced',
  ...overrides,
});

describe('PlacesComponent', () => {
  const dataService = {
    getBookRecord: vi.fn(),
    getRecords: vi.fn(),
    getAllowedTags: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  const showError = vi.fn();
  let fixture: ComponentFixture<PlacesComponent>;
  let component: PlacesComponent;

  async function create(rows: PlaceRecord[]): Promise<void> {
    dataService.getRecords.mockResolvedValue(rows);
    fixture = TestBed.createComponent(PlacesComponent);
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
    dataService.getAllowedTags.mockResolvedValue(['#setting']);

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        { provide: PlaceDataService, useValue: dataService },

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
    TestBed.inject(StudySearchService).query.set('');
    TestBed.inject(PermissionService).setRole('admin');
  });

  it('filters by place fields and exact or unprefixed tag searches', async () => {
    await create([place('p1'), place('p2', { name: 'Something else', tags: [] })]);

    TestBed.inject(StudySearchService).query.set('something');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['p2']);
    TestBed.inject(StudySearchService).query.set('#setting');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['p1']);
    TestBed.inject(StudySearchService).query.set('setting');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['p1']);
  });

  it('creates a normalized place and updates the list after success', async () => {
    await create([]);
    const saved = place('gas-1', { itemRow: 0, tags: ['#setting'] });
    dataService.addDomainItem.mockResolvedValue(saved);
    component.newName.set('  Dublin  ');
    component.newCoordinates.set('53.3498, -6.2603');
    component.newTags.set(['Setting']);

    await component.saveEntry();

    expect(dataService.updateDomainItem).not.toHaveBeenCalled();
    expect(dataService.addDomainItem).toHaveBeenCalledWith(
      expect.objectContaining({
        bookId: 'book-1',
        bookRow: 8,
        itemRow: 0,
        name: 'Dublin',
        coordinates: '53.3498, -6.2603',
        tags: ['#setting'],
        syncStatus: 'pending',
      }),
    );
    expect(component.rows()).toEqual([saved]);
    expect(component.newName()).toBe('');
  });

  it('updates the original place while retaining row and contributor metadata', async () => {
    const original = place('p1', { itemRow: 21 });
    await create([original]);
    const updated = { ...original, name: 'Updated place' };
    dataService.updateDomainItem.mockResolvedValue(updated);
    component.editEntry(original);
    component.newName.set('Updated place');

    await component.saveEntry();

    expect(dataService.addDomainItem).not.toHaveBeenCalled();
    expect(dataService.updateDomainItem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'p1',
        bookRow: 8,
        itemRow: 21,
        contributor: 'reader@example.com',
        name: 'Updated place',
      }),
    );
    expect(component.rows()).toEqual([updated]);
  });

  it('keeps form state when saving fails', async () => {
    await create([]);
    dataService.addDomainItem.mockRejectedValue(new Error('GAS failed'));
    component.newName.set('Dublin');

    await component.saveEntry();

    expect(showError).toHaveBeenCalledWith('GAS failed');
    expect(component.rows()).toEqual([]);
    expect(component.newName()).toBe('Dublin');
  });

  it('removes a place only after confirmed remote deletion', async () => {
    const row = place('p1', { itemRow: 21 });
    await create([row, place('p2')]);
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    dataService.deleteDomainItem.mockRejectedValueOnce(new Error('GAS failed'));
    await component.deleteEntry('p1');
    expect(component.rows()).toHaveLength(2);

    dataService.deleteDomainItem.mockResolvedValueOnce(undefined);
    await component.deleteEntry('p1');
    expect(dataService.deleteDomainItem).toHaveBeenLastCalledWith(row);
    expect(component.rows().map((item) => item.id)).toEqual(['p2']);
    vi.unstubAllGlobals();
  });
});
