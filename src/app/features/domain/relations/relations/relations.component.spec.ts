import { AllDomainWriteSyncService } from '../../shared/domain-repository/all-domain-write-sync.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { StudySearchService } from '../../../../core/services/search/study-search.service';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { CharacterRecord } from '../../characters/model/characters-model';
import { RelationRecord } from '../model/relations-model';
import { RelationDataService } from '../services/relations.service';
import { RelationsComponent } from './relations.component';

const character = (id: string, name: string): CharacterRecord => ({
  id,
  bookId: 'book-1',
  bookRow: 8,
  itemRow: Number(id.replace(/\D/g, '')) + 1,
  name,
  role: 'supporting',
  tags: [],
  feed: 5,
  contributor: '',
  syncStatus: 'synced',
});

const relation = (id: string, overrides: Partial<RelationRecord> = {}): RelationRecord => ({
  id,
  bookId: 'book-1',
  bookRow: 8,
  itemRow: Number(id.replace(/\D/g, '')) + 1,
  sourceCharacterId: 'character-1',
  targetCharacterId: 'character-2',
  relationType: 'parent of',
  directed: true,
  description: 'A family relationship.',
  color: '#D4A373',
  book: 'Book One',
  author: 'Author One',
  page: '22',
  tags: ['#family'],
  feed: 5,
  contributor: 'reader@example.com',
  syncStatus: 'synced',
  ...overrides,
});

describe('RelationsComponent', () => {
  const dataService = {
    getBookRecord: vi.fn(),
    getRecords: vi.fn(),
    getCharacters: vi.fn(),
    getAllowedTags: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  const showError = vi.fn();
  let fixture: ComponentFixture<RelationsComponent>;
  let component: RelationsComponent;

  async function create(rows: RelationRecord[]): Promise<void> {
    dataService.getRecords.mockResolvedValue(rows);
    fixture = TestBed.createComponent(RelationsComponent);
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
    dataService.getCharacters.mockResolvedValue([
      character('character-1', 'Alice'),
      character('character-2', 'Bob'),
    ]);
    dataService.getAllowedTags.mockResolvedValue(['#family']);

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        { provide: RelationDataService, useValue: dataService },

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

  it('filters relations by endpoint names and both tagged search forms', async () => {
    await create([relation('r1'), relation('r2', { description: 'Something else', tags: [] })]);

    TestBed.inject(StudySearchService).query.set('alice');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['r1', 'r2']);
    TestBed.inject(StudySearchService).query.set('#family');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['r1']);
    TestBed.inject(StudySearchService).query.set('family');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['r1']);
  });

  it('rejects invalid endpoints and self-relations', async () => {
    await create([]);
    component.newSourceCharacterId.set('character-1');
    component.newTargetCharacterId.set('character-1');
    component.newRelationType.set('sibling of');
    component.newDescription.set('A family relationship.');
    expect(component.isFormInvalid()).toBe(true);

    component.newTargetCharacterId.set('unknown-character');
    expect(component.isFormInvalid()).toBe(true);
  });

  it('creates a normalized relation with both character IDs and book row metadata', async () => {
    await create([]);
    const saved = relation('gas-1', { itemRow: 0, contributor: '' });
    dataService.addDomainItem.mockResolvedValue(saved);
    component.newSourceCharacterId.set('character-1');
    component.newTargetCharacterId.set('character-2');
    component.newRelationType.set(' parent of ');
    component.newDescription.set(' A family relationship. ');
    component.newTags.set(['Family']);

    await component.saveRelation();

    expect(dataService.updateDomainItem).not.toHaveBeenCalled();
    expect(dataService.addDomainItem).toHaveBeenCalledWith(
      expect.objectContaining({
        bookId: 'book-1',
        bookRow: 8,
        itemRow: 0,
        sourceCharacterId: 'character-1',
        targetCharacterId: 'character-2',
        relationType: 'parent of',
        description: 'A family relationship.',
        tags: ['#family'],
        syncStatus: 'pending',
      }),
    );
    expect(component.rows()).toEqual([saved]);
  });

  it('updates the original relation and keeps its row and contributor data', async () => {
    const original = relation('r1', { itemRow: 22 });
    await create([original]);
    const updated = { ...original, directed: false };
    dataService.updateDomainItem.mockResolvedValue(updated);
    component.editEntry(original);
    component.newDirected.set(false);

    await component.saveRelation();

    expect(dataService.addDomainItem).not.toHaveBeenCalled();
    expect(dataService.updateDomainItem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'r1',
        bookRow: 8,
        itemRow: 22,
        contributor: 'reader@example.com',
        directed: false,
      }),
    );
    expect(component.rows()).toEqual([updated]);
  });

  it('deletes locally only after confirmed remote success', async () => {
    const row = relation('r1', { itemRow: 22 });
    await create([row, relation('r2')]);
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    dataService.deleteDomainItem.mockRejectedValueOnce(new Error('GAS failed'));
    await component.deleteEntry('r1');
    expect(component.rows()).toHaveLength(2);

    dataService.deleteDomainItem.mockResolvedValueOnce(undefined);
    await component.deleteEntry('r1');
    expect(dataService.deleteDomainItem).toHaveBeenLastCalledWith(row);
    expect(component.rows().map((item) => item.id)).toEqual(['r2']);
    vi.unstubAllGlobals();
  });
});
