import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagPickerComponent } from '../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../../shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { DomainConceptsComponent } from '../../domain-concept/domain-concept.component';

@Component({
  selector: 'app-concept-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    TagPickerComponent,
    DomainEntryFormOverlayComponent,
  ],
  templateUrl: './concept-form.component.html',
})
export class ConceptFormComponent {
  readonly form = input.required<DomainConceptsComponent>();
}
