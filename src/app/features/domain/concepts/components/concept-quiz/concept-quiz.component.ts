import { Component, input } from '@angular/core';
import { QuestionGeneratorComponent } from '../../../questions/components/question-generator/question-generator.component';
import { ConceptRecord } from '../../model/concepts-model';

@Component({
  selector: 'app-concept-quiz-generator',
  imports: [QuestionGeneratorComponent],
  template: `
    <app-question-generator
      [sourceTerm]="concept().term"
      [sourceText]="concept().definition"
      [sourceDomain]="sourceDomain()"
      [sourceRowId]="concept().id"
      [bookRow]="concept().bookRow"
      [bookId]="concept().bookId"
      [bookName]="bookName()"
      [tags]="concept().tags"
    />
  `,
})
export class ConceptQuizGeneratorComponent {
  readonly concept = input.required<ConceptRecord>();
  readonly sourceDomain = input('CONCEPTS');
  readonly bookName = input('');
}
