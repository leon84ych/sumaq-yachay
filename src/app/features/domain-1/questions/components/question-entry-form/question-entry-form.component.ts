import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagPickerComponent } from '../../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../../domain/shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { QuestionsComponent } from '../../questions/questions.component';

@Component({
  selector: 'app-question-entry-form-1',
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    TagPickerComponent,
    DomainEntryFormOverlayComponent,
  ],
  templateUrl: './question-entry-form.component.html',
})
export class QuestionEntryFormComponent {
  readonly form = input.required<QuestionsComponent>();
}
