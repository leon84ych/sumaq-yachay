import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagPickerComponent } from '../../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { ConceptsComponent } from '../../concepts/concepts.component';

@Component({
  selector: 'app-concept-entry-form-1',
  imports: [FormsModule, TranslocoPipe, TagPickerComponent, DomainEntryFormOverlayComponent],
  templateUrl: './concept-entry-form.component.html',
})
export class ConceptEntryFormComponent {
  readonly form = input.required<ConceptsComponent>();
}
