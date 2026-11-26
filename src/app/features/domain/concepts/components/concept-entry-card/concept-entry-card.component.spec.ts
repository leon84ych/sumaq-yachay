import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission/permission.service';
import { QuestionGeneratorComponent } from '../../../questions/components/question-generator/question-generator.component';
import { ConceptRecord } from '../../model/concepts-model';
import { ConceptQuizGeneratorComponent } from '../concept-quiz/concept-quiz.component';
import { ConceptEntryCardComponent } from './concept-entry-card.component';

@Component({ selector: 'app-question-generator', template: '' })
class QuestionGeneratorStubComponent {
  readonly sourceTerm = input.required<string>();
  readonly sourceText = input.required<string>();
  readonly sourceDomain = input.required<string>();
  readonly sourceRowId = input.required<string>();
  readonly bookRow = input.required<number>();
  readonly bookName = input('');
  readonly tags = input<string[]>([]);
}

const record: ConceptRecord = {
  id: 'c1',
  bookId: 'book-1',
  bookRow: 7,
  itemRow: 15,
  term: 'Eternal return',
  definition: 'The same life repeats.',
  category: 'principle-axiom',
  source: 'Book',
  tags: ['#one'],
  syncStatus: 'synced',
  contributor: 'admin@example.com',
  feed: 5,
};

describe('ConceptEntryCardComponent', () => {
  let fixture: ComponentFixture<ConceptEntryCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
    });
    TestBed.overrideComponent(ConceptQuizGeneratorComponent, {
      remove: { imports: [QuestionGeneratorComponent] },
      add: { imports: [QuestionGeneratorStubComponent] },
    });
    TestBed.inject(PermissionService).setRole('admin');
    fixture = TestBed.createComponent(ConceptEntryCardComponent);
    fixture.componentRef.setInput('row', record);
  });

  it('renders the term, definition and tags and emits the full record on edit', () => {
    let edited: ConceptRecord | undefined;
    fixture.componentInstance.editRequested.subscribe((row) => (edited = row));
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('The same life repeats.');
    expect(element.textContent).toContain('#one');
    element.querySelector<HTMLButtonElement>('.domain-edit-button')?.click();
    expect(edited).toEqual(record);
  });

  it('emits the record id on delete', () => {
    let deleted: string | undefined;
    fixture.componentInstance.deleteRequested.subscribe((id) => (deleted = id));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.domain-delete-button')?.click();
    expect(deleted).toBe('c1');
  });

  it('hides edit and delete actions for guests', () => {
    TestBed.inject(PermissionService).setRole('guest');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.domain-edit-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.domain-delete-button')).toBeNull();
  });

  it('keeps the quiz generator hidden unless enabled', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-concept-quiz-generator-1')).toBeNull();

    fixture.componentRef.setInput('showQuiz', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-concept-quiz-generator-1')).not.toBeNull();
  });
});

describe('ConceptQuizGeneratorComponent', () => {
  it('feeds the question generator with the concept term, definition, book row and tags', () => {
    TestBed.overrideComponent(ConceptQuizGeneratorComponent, {
      remove: { imports: [QuestionGeneratorComponent] },
      add: { imports: [QuestionGeneratorStubComponent] },
    });
    const fixture = TestBed.createComponent(ConceptQuizGeneratorComponent);
    fixture.componentRef.setInput('concept', record);
    fixture.componentRef.setInput('bookName', 'Book One');
    fixture.detectChanges();

    const generator = fixture.debugElement.children[0]
      .componentInstance as QuestionGeneratorStubComponent;
    expect(generator.sourceTerm()).toBe('Eternal return');
    expect(generator.sourceText()).toBe('The same life repeats.');
    expect(generator.sourceDomain()).toBe('CONCEPTS');
    expect(generator.sourceRowId()).toBe('c1');
    expect(generator.bookRow()).toBe(7);
    expect(generator.bookName()).toBe('Book One');
    expect(generator.tags()).toEqual(['#one']);
  });
});
