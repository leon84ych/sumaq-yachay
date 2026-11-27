import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserAiService } from '../../../../../core/services/ia/BrowserIA.service';
import { GlobalMessageService } from '../../../../../core/services/global-message.service';
import { PermissionService } from '../../../../../core/services/permission/permission.service';
import { QuestionDataService } from '../../../../domain/questions/services/questions.service';
import { QuestionGeneratorComponent } from './question-generator.component';

describe('QuestionGeneratorComponent', () => {
  const generatedQuestion = vi.fn();
  const addDomainItem = vi.fn();
  const showError = vi.fn();
  let fixture: ComponentFixture<QuestionGeneratorComponent>;
  let component: QuestionGeneratorComponent;

  beforeEach(() => {
    vi.resetAllMocks();
    generatedQuestion.mockResolvedValue('What does entropy measure?');
    addDomainItem.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        {
          provide: BrowserAiService,
          useValue: { isAiAvailable: signal(true), generateQuestionFromEntry: generatedQuestion },
        },
        { provide: QuestionDataService, useValue: { addDomainItem } },
        { provide: GlobalMessageService, useValue: { showError } },
      ],
    });
    TestBed.inject(PermissionService).setRole('admin');
    fixture = TestBed.createComponent(QuestionGeneratorComponent);
    fixture.componentRef.setInput('sourceTerm', 'Entropy');
    fixture.componentRef.setInput('sourceText', 'A measure of disorder.');
    fixture.componentRef.setInput('sourceDomain', 'CONCEPTS');
    fixture.componentRef.setInput('sourceRowId', 'concept-1');
    fixture.componentRef.setInput('bookRow', 8);
    fixture.componentRef.setInput('bookId', 'book-1');
    fixture.componentRef.setInput('bookName', 'Book One');
    fixture.componentRef.setInput('tags', ['#physics']);
    component = fixture.componentInstance;
  });

  it('saves generated questions through the v2 data service for the owning book', async () => {
    await component.generateAndSave();

    expect(generatedQuestion).toHaveBeenCalledWith('Entropy', 'A measure of disorder.', 'open');
    expect(addDomainItem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringMatching(/^book-1_QUESTIONS_\d+$/),
        bookId: 'book-1',
        bookRow: 8,
        itemRow: 0,
        question: 'What does entropy measure?',
        answer: 'A measure of disorder.',
        sourceDomain: 'CONCEPTS',
        sourceRowId: 'concept-1',
        tags: ['#physics'],
        aiGenerated: true,
        syncStatus: 'pending',
      }),
    );
    expect(showError).not.toHaveBeenCalled();
  });
});
