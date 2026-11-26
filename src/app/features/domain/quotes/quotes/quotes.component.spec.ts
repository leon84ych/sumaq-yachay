import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { StudySearchService } from '../../../../core/services/search/study-search.service';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { QuoteRecord } from '../model/quotes-model';
import { QuoteDataService } from '../services/quotes.service';
import { QuotesComponent } from './quotes.component';

const quote = (id: string, overrides: Partial<QuoteRecord> = {}): QuoteRecord => ({
  id,
  bookId: 'book-1',
  bookRow: 7,
  itemRow: Number(id.replace(/\D/g, '')) + 1,
  quote: `Quote ${id}`,
  analysis: '',
  book: 'Book One',
  author: 'Author One',
  page: '',
  tags: ['#memory'],
  syncStatus: 'synced',
  contributor: 'admin@example.com',
  feed: 5,
  ...overrides,
});

describe('QuotesComponent', () => {
  const dataService = {
    getBookRecord: vi.fn(),
    getRecords: vi.fn(),
    getAllowedTags: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  const showError = vi.fn();
  let fixture: ComponentFixture<QuotesComponent>;
  let component: QuotesComponent;

  async function create(rows: QuoteRecord[]): Promise<void> {
    dataService.getRecords.mockResolvedValue(rows);
    fixture = TestBed.createComponent(QuotesComponent);
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
        { provide: QuoteDataService, useValue: dataService },
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
  });

  it('loads the book context and renders cards, filtering through the shared search query', async () => {
    await create([quote('q1'), quote('q2', { quote: 'Something else', tags: [] })]);

    expect(component.bookName()).toBe('Book One');
    expect(component.bookRow()).toBe(7);
    expect(fixture.nativeElement.querySelectorAll('app-quote-entry-card')).toHaveLength(2);

    TestBed.inject(StudySearchService).query.set('something');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['q2']);

    TestBed.inject(StudySearchService).query.set('#memory');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['q1']);

    TestBed.inject(StudySearchService).query.set('memory');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['q1']);

    TestBed.inject(StudySearchService).query.set('nothing matches');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-quote-entry-card')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.domain-search')).not.toBeNull();
  });

  it('creates a quote with bookRow, itemRow 0 and normalized tags, then resets the form', async () => {
    await create([]);
    const saved = quote('gas-1', { itemRow: 0, tags: ['#memory'] });
    dataService.addDomainItem.mockResolvedValue(saved);

    component.newQuote.set('  New quote  ');
    component.newTags.set(['Memory']);
    await component.saveQuote();

    expect(dataService.updateDomainItem).not.toHaveBeenCalled();
    expect(dataService.addDomainItem).toHaveBeenCalledWith(
      expect.objectContaining({
        bookId: 'book-1',
        bookRow: 7,
        itemRow: 0,
        quote: 'New quote',
        book: 'Book One',
        author: 'Author One',
        tags: ['#memory'],
        syncStatus: 'pending',
      }),
    );
    expect(component.rows()).toEqual([saved]);
    expect(component.newQuote()).toBe('');
  });

  it('updates the original record keeping itemRow and contributor when editing', async () => {
    const original = quote('q1', { itemRow: 15 });
    await create([original]);
    const updated = { ...original, quote: 'Edited' };
    dataService.updateDomainItem.mockResolvedValue(updated);

    component.editEntry(original);
    component.newQuote.set('Edited');
    await component.saveQuote();

    expect(dataService.addDomainItem).not.toHaveBeenCalled();
    expect(dataService.updateDomainItem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'q1',
        bookRow: 7,
        itemRow: 15,
        contributor: 'admin@example.com',
        quote: 'Edited',
      }),
    );
    expect(component.rows()).toEqual([updated]);
    expect(component.editingId()).toBeNull();
  });

  it('rejects tags outside the book taxonomy', async () => {
    await create([]);

    component.newQuote.set('A quote');
    component.newTags.set(['#unlisted']);

    expect(component.invalidTagsDetected()).toEqual(['#unlisted']);
    expect(component.isFormInvalid()).toBe(true);
    await component.saveQuote();
    expect(dataService.addDomainItem).not.toHaveBeenCalled();
  });

  it('keeps the form state and shows an error when saving fails', async () => {
    await create([]);
    dataService.addDomainItem.mockRejectedValue(new Error('GAS failed'));

    component.newQuote.set('A quote');
    await component.saveQuote();

    expect(showError).toHaveBeenCalledWith('GAS failed');
    expect(component.rows()).toEqual([]);
    expect(component.newQuote()).toBe('A quote');
  });

  it('deletes the complete record after confirmation and removes it only on success', async () => {
    const row = quote('q1', { itemRow: 15 });
    await create([row, quote('q2')]);
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );

    dataService.deleteDomainItem.mockRejectedValueOnce(new Error('GAS failed'));
    await component.deleteEntry('q1');
    expect(component.rows()).toHaveLength(2);

    dataService.deleteDomainItem.mockResolvedValueOnce(undefined);
    await component.deleteEntry('q1');
    expect(dataService.deleteDomainItem).toHaveBeenLastCalledWith(row);
    expect(component.rows().map((item) => item.id)).toEqual(['q2']);
    vi.unstubAllGlobals();
  });

  it('does not delete when the confirmation is declined', async () => {
    await create([quote('q1')]);
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    );

    await component.deleteEntry('q1');

    expect(dataService.deleteDomainItem).not.toHaveBeenCalled();
    expect(component.rows()).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});
