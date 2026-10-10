import { Component, input } from '@angular/core';
import { ConceptRow } from '../../catalog-detail/models/domain-sheet.model';
import { QuestionGeneratorComponent } from '../../domain-questions/components/question-generator/question-generator.component';

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
