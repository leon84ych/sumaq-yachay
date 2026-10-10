import { Component, input } from '@angular/core';

import { QuestionGeneratorComponent } from '../../domain-questions/components/question-generator/question-generator.component';
import { ConceptRow } from '../model/domain-concept-row.model';

@Component({
  selector: 'app-concept-quiz-generator',
  standalone: true,
  imports: [QuestionGeneratorComponent],
  template: `
    <app-question-generator
      [sourceTerm]="concept().term"
      [sourceText]="concept().definition"
      [sourceDomain]="sourceDomain()"
      [sourceRowId]="concept().id"
      [bookRow]="bookRow()"
      [bookName]="bookName()"
      [tags]="concept().tags ?? ''"
    />
  `,
})
export class ConceptQuizGeneratorComponent {
  readonly concept = input.required<ConceptRow>();
  readonly sourceDomain = input('CONCEPTS');
  readonly bookRow = input.required<number>();
  readonly bookName = input('');
}
