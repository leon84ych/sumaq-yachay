import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { StudySearchService } from '../../../../core/services/search/study-search.service';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { PassageRecord } from '../model/passages-model';
import { PassageDataService } from '../services/passages.service';
import { PassagesComponent } from './passages.component';

const passage = (id: string, overrides: Partial<PassageRecord> = {}): PassageRecord => ({
  id,
  bookId: 'book-1',
  bookRow: 7,
  itemRow: Number(id.replace(/\D/g, '')) + 1,
  title: `Title ${id}`,
  passageText: `Text of ${id}`,
  book: 'Book One',
  author: 'Author One',
  page: '',
  tags: ['#memory'],
  syncStatus: 'synced',
  contributor: 'admin@example.com',
  feed: 5,
  ...overrides,
});

describe('PassagesComponent', () => {
  const dataService = {
    getBookRecord: vi.fn(),
    getRecords: vi.fn(),
    getAllowedTags: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  const showError = vi.fn();
  let fixture: ComponentFixture<PassagesComponent>;
  let component: PassagesComponent;

  async function create(rows: PassageRecord[]): Promise<void> {
    dataService.getRecords.mockResolvedValue(rows);
    fixture = TestBed.createComponent(PassagesComponent);
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
        { provide: PassageDataService, useValue: dataService },
        { provide: GlobalMessageService, useValue: { showError } },
        {
          provide: LocalDBService,
          useValue: {
            indexedDB: { tags: { where: () => ({ equals: () => ({ toArray: async () => [] }) }) } },
          },
        },
      ],
    });
    TestBed.inject(PermissionService).setRole('admin');
    TestBed.inject(StudySearchService).query.set('');
  });

  it('loads the book context and renders cards, filtering through the shared search query', async () => {
    await create([passage('p1'), passage('p2', { title: 'Something else', tags: [] })]);

    expect(component.bookName()).toBe('Book One');
    expect(component.bookRow()).toBe(7);
    expect(fixture.nativeElement.querySelectorAll('app-passage-entry-card')).toHaveLength(2);

    TestBed.inject(StudySearchService).query.set('something');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['p2']);

    TestBed.inject(StudySearchService).query.set('#memory');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['p1']);

    TestBed.inject(StudySearchService).query.set('memory');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['p1']);

    TestBed.inject(StudySearchService).query.set('nothing matches');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-passage-entry-card')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.domain-search')).not.toBeNull();
  });

  it('creates a passage with bookRow, itemRow 0 and normalized tags, then resets the form', async () => {
    await create([]);
    const saved = passage('gas-1', { itemRow: 0, tags: ['#memory'] });
    dataService.addDomainItem.mockResolvedValue(saved);

    component.newTitle.set('  New title ');
    component.newPassageText.set('  New text  ');
    component.newTags.set(['Memory']);
    await component.savePassage();

    expect(dataService.updateDomainItem).not.toHaveBeenCalled();
    expect(dataService.addDomainItem).toHaveBeenCalledWith(
      expect.objectContaining({
        bookId: 'book-1',
        bookRow: 7,
        itemRow: 0,
        title: 'New title',
        passageText: 'New text',
        book: 'Book One',
        author: 'Author One',
        tags: ['#memory'],
        feed: 5,
        syncStatus: 'pending',
      }),
    );
    expect(component.rows()).toEqual([saved]);
    expect(component.newTitle()).toBe('');
  });

  it('updates the original record keeping itemRow, feed and contributor when editing', async () => {
    const original = passage('p1', { itemRow: 15, feed: 3 });
    await create([original]);
    const updated = { ...original, title: 'Edited' };
    dataService.updateDomainItem.mockResolvedValue(updated);

    component.editEntry(original);
    component.newTitle.set('Edited');
    await component.savePassage();

    expect(dataService.addDomainItem).not.toHaveBeenCalled();
    expect(dataService.updateDomainItem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'p1',
        bookRow: 7,
        itemRow: 15,
        feed: 3,
        contributor: 'admin@example.com',
        title: 'Edited',
      }),
    );
    expect(component.rows()).toEqual([updated]);
    expect(component.editingId()).toBeNull();
  });

  it('rejects tags outside the book taxonomy', async () => {
    await create([]);

    component.newTitle.set('A title');
    component.newPassageText.set('A passage');
    component.newTags.set(['#unlisted']);

    expect(component.invalidTagsDetected()).toEqual(['#unlisted']);
    expect(component.isFormInvalid()).toBe(true);
    await component.savePassage();
    expect(dataService.addDomainItem).not.toHaveBeenCalled();
  });

  it('keeps the form state and shows an error when saving fails', async () => {
    await create([]);
    dataService.addDomainItem.mockRejectedValue(new Error('GAS failed'));

    component.newTitle.set('A title');
    component.newPassageText.set('A passage');
    await component.savePassage();

    expect(showError).toHaveBeenCalledWith('GAS failed');
    expect(component.rows()).toEqual([]);
    expect(component.newPassageText()).toBe('A passage');
  });

  it('deletes the complete record after confirmation and removes it only on success', async () => {
    const row = passage('p1', { itemRow: 15 });
    await create([row, passage('p2')]);
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

  it('does not delete when the confirmation is declined', async () => {
    await create([passage('p1')]);
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    );

    await component.deleteEntry('p1');

    expect(dataService.deleteDomainItem).not.toHaveBeenCalled();
    expect(component.rows()).toHaveLength(1);
    vi.unstubAllGlobals();
  });

  it('opens and closes the reader for a passage', async () => {
    await create([passage('p1')]);

    component.openReader(component.rows()[0]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-passage-reader')).not.toBeNull();

    component.closeReader();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-passage-reader')).toBeNull();
  });
});
