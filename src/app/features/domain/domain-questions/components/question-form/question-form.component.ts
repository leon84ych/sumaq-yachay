import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagPickerComponent } from '../../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { QuestionsComponent } from '../../domain-questions/question.component';

@Component({
  selector: 'app-question-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    TagPickerComponent,
    DomainEntryFormOverlayComponent,
  ],
  templateUrl: './question-form.component.html',
  styleUrl: './question-form.component.css',
})
export class QuestionFormComponent {
  readonly form = input.required<QuestionsComponent>();
}
