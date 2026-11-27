import { AllDomainWriteSyncService } from '../../shared/domain-repository/all-domain-write-sync.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { StudySearchService } from '../../../../core/services/search/study-search.service';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { LanguageService } from '../../../../shared/language/language.service';
import { signal } from '@angular/core';
import { GlossaryRecord } from '../model/glossary-model';
import { GlossaryDataService } from '../services/glossary.service';
import { GlossaryComponent } from './glossary.component';

const entry = (id: string, overrides: Partial<GlossaryRecord> = {}): GlossaryRecord => ({
  id,
  bookId: 'book-1',
  bookRow: 8,
  itemRow: Number(id.replace(/\D/g, '')) + 1,
  term: `Term ${id}`,
  language: 'English',
  definition: `Definition ${id}`,
  partOfSpeech: 'Noun',
  tags: ['#memory'],
  feed: 5,
  contributor: 'reader@example.com',
  syncStatus: 'synced',
  ...overrides,
});

describe('GlossaryComponent', () => {
  const dataService = {
    getBookRecord: vi.fn(),
    getRecords: vi.fn(),
    getAllowedTags: vi.fn(),
    rememberLanguage: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  const showError = vi.fn();
  let fixture: ComponentFixture<GlossaryComponent>;
  let component: GlossaryComponent;

  async function create(rows: GlossaryRecord[]): Promise<void> {
    dataService.getRecords.mockResolvedValue(rows);
    fixture = TestBed.createComponent(GlossaryComponent);
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
      language: 'English',
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
        { provide: GlossaryDataService, useValue: dataService },

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
          provide: LanguageService,
          useValue: { languages: signal(['English', 'Japanese', 'Japonés', 'Quechua']) },
        },
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

  it('filters entries by glossary text and normalized tags', async () => {
    await create([entry('g1'), entry('g2', { term: 'Something else', tags: [] })]);

    TestBed.inject(StudySearchService).query.set('something');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['g2']);

    TestBed.inject(StudySearchService).query.set('#memory');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['g1']);

    TestBed.inject(StudySearchService).query.set('memory');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['g1']);
  });

  it('creates a normalized glossary entry and resets the form after success', async () => {
    await create([]);
    const saved = entry('gas-1', { itemRow: 0, tags: ['#memory'] });
    dataService.addDomainItem.mockResolvedValue(saved);

    component.newTerm.set('  Logos  ');
    expect(component.newLanguage()).toBe('English');
    component.newLanguage.set('  Ancient Greek  ');
    component.newDefinition.set('  A principle of reason.  ');
    component.newTags.set(['Memory']);
    await component.saveEntry();

    expect(dataService.updateDomainItem).not.toHaveBeenCalled();
    expect(dataService.addDomainItem).toHaveBeenCalledWith(
      expect.objectContaining({
        bookId: 'book-1',
        bookRow: 8,
        itemRow: 0,
        term: 'Logos',
        language: 'Ancient Greek',
        definition: 'A principle of reason.',
        source: 'Book One',
        tags: ['#memory'],
        syncStatus: 'pending',
      }),
    );
    expect(component.rows()).toEqual([saved]);
    expect(component.newTerm()).toBe('');
    expect(component.newLanguage()).toBe('');
  });

  it('displays the entry language on the glossary card', async () => {
    await create([entry('g1', { language: 'Ancient Greek' })]);

    expect(fixture.nativeElement.textContent).toContain('Ancient Greek');
  });

  it('offers shared languages and accepts a new glossary language', async () => {
    await create([]);
    fixture.componentRef.setInput('isAddingEntry', true);
    fixture.detectChanges();
    const languageInput = fixture.nativeElement.querySelector(
      '#glossary-language',
    ) as HTMLInputElement;
    languageInput.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    const options = [
      ...fixture.nativeElement.querySelectorAll('[role="option"]'),
    ] as HTMLButtonElement[];
    expect(options.map((option) => option.textContent?.trim())).toEqual([
      'English',
      'Japanese',
      'Japonés',
      'Quechua',
    ]);
    options[2].click();
    expect(component.newLanguage()).toBe('Japonés');
    languageInput.value = 'Aymara';
    languageInput.dispatchEvent(new Event('input'));
    expect(component.newLanguage()).toBe('Aymara');
  });

  it('updates the original entry while preserving its item row and contributor', async () => {
    const original = entry('g1', { itemRow: 19 });
    await create([original]);
    const updated = { ...original, definition: 'Updated definition' };
    dataService.updateDomainItem.mockResolvedValue(updated);

    component.editEntry(original);
    component.newDefinition.set('Updated definition');
    await component.saveEntry();

    expect(dataService.addDomainItem).not.toHaveBeenCalled();
    expect(dataService.updateDomainItem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'g1',
        bookRow: 8,
        itemRow: 19,
        contributor: 'reader@example.com',
        definition: 'Updated definition',
      }),
    );
    expect(component.rows()).toEqual([updated]);
  });

  it('retains form values and rows when a save fails', async () => {
    await create([]);
    dataService.addDomainItem.mockRejectedValue(new Error('GAS failed'));
    component.newTerm.set('Logos');
    component.newDefinition.set('A principle of reason.');

    await component.saveEntry();

    expect(showError).toHaveBeenCalledWith('GAS failed');
    expect(component.rows()).toEqual([]);
    expect(component.newTerm()).toBe('Logos');
  });

  it('removes a complete record only after confirmed remote deletion', async () => {
    const row = entry('g1', { itemRow: 19 });
    await create([row, entry('g2')]);
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    dataService.deleteDomainItem.mockRejectedValueOnce(new Error('GAS failed'));
    await component.deleteEntry('g1');
    expect(component.rows()).toHaveLength(2);

    dataService.deleteDomainItem.mockResolvedValueOnce(undefined);
    await component.deleteEntry('g1');
    expect(dataService.deleteDomainItem).toHaveBeenLastCalledWith(row);
    expect(component.rows().map((item) => item.id)).toEqual(['g2']);
    vi.unstubAllGlobals();
  });
});
