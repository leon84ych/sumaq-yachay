import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { StudySearchService } from '../../../../core/services/search/study-search.service';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { QuestionRecord } from '../model/questions-model';
import { QuestionDataService } from '../services/questions.service';
import { QuestionsComponent } from './questions.component';

const question = (id: string, overrides: Partial<QuestionRecord> = {}): QuestionRecord => ({
  id,
  bookId: 'book-1',
  bookRow: 8,
  itemRow: Number(id.replace(/\D/g, '')) + 1,
  question: `Question ${id}`,
  answer: `Answer ${id}`,
  type: 'open',
  options: [],
  sourceDomain: 'CONCEPTS',
  sourceTerm: 'Entropy',
  bookName: 'Book One',
  page: '12',
  difficulty: 'medium',
  aiGenerated: false,
  tags: ['#physics'],
  feed: 5,
  contributor: 'reader@example.com',
  syncStatus: 'synced',
  ...overrides,
});

describe('QuestionsComponent', () => {
  const dataService = {
    getBookRecord: vi.fn(),
    getRecords: vi.fn(),
    getAllowedTags: vi.fn(),
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
  };
  const showError = vi.fn();
  let fixture: ComponentFixture<QuestionsComponent>;
  let component: QuestionsComponent;

  async function create(rows: QuestionRecord[]): Promise<void> {
    dataService.getRecords.mockResolvedValue(rows);
    fixture = TestBed.createComponent(QuestionsComponent);
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
    dataService.getAllowedTags.mockResolvedValue(['#physics']);

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        { provide: QuestionDataService, useValue: dataService },
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

  it('filters by question content and exact or unprefixed tag query', async () => {
    await create([question('q1'), question('q2', { tags: [], question: 'Something else' })]);

    TestBed.inject(StudySearchService).query.set('something');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['q2']);
    TestBed.inject(StudySearchService).query.set('#physics');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['q1']);
    TestBed.inject(StudySearchService).query.set('physics');
    expect(component.filteredRows().map((row) => row.id)).toEqual(['q1']);
  });

  it('requires a valid correct option for multiple-choice questions', async () => {
    await create([]);
    component.newQuestion.set('Which answer?');
    component.newAnswer.set('A');
    component.newType.set('multiple-choice');
    component.newSourceDomain.set('MANUAL');
    component.optionDrafts.set(['A', 'B']);
    component.correctOptionIndex.set(0);
    expect(component.isFormInvalid()).toBe(false);
    component.optionDrafts.set(['A', '']);
    expect(component.isFormInvalid()).toBe(true);
  });

  it('creates a normalized question with typed options and book metadata', async () => {
    await create([]);
    const saved = question('gas-1', { itemRow: 0, contributor: '' });
    dataService.addDomainItem.mockResolvedValue(saved);
    component.newQuestion.set(' Which concept? ');
    component.newAnswer.set(' Entropy ');
    component.newType.set('multiple-choice');
    component.optionDrafts.set(['Entropy', 'Energy']);
    component.correctOptionIndex.set(0);
    component.newTags.set(['Physics']);

    await component.saveQuestion();

    expect(dataService.updateDomainItem).not.toHaveBeenCalled();
    expect(dataService.addDomainItem).toHaveBeenCalledWith(
      expect.objectContaining({
        bookId: 'book-1',
        bookRow: 8,
        itemRow: 0,
        question: 'Which concept?',
        answer: 'Entropy',
        options: [
          expect.objectContaining({ text: 'Entropy', isCorrect: true }),
          expect.objectContaining({ text: 'Energy', isCorrect: false }),
        ],
        tags: ['#physics'],
        syncStatus: 'pending',
      }),
    );
    expect(component.rows()).toEqual([saved]);
  });

  it('updates the original question retaining item row and source reference', async () => {
    const original = question('q1', { itemRow: 24 });
    await create([original]);
    const updated = { ...original, answer: 'A new answer' };
    dataService.updateDomainItem.mockResolvedValue(updated);
    component.editEntry(original);
    component.newAnswer.set('A new answer');

    await component.saveQuestion();

    expect(dataService.addDomainItem).not.toHaveBeenCalled();
    expect(dataService.updateDomainItem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'q1',
        bookRow: 8,
        itemRow: 24,
        sourceRowId: original.sourceRowId,
        contributor: 'reader@example.com',
      }),
    );
    expect(component.rows()).toEqual([updated]);
  });

  it('deletes a question locally only after confirmed remote success', async () => {
    const row = question('q1', { itemRow: 24 });
    await create([row, question('q2')]);
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
});
