import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagPickerComponent } from '../../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { AssociationsComponent } from '../../associations/associations.component';

@Component({
  selector: 'app-association-entry-form',
  imports: [FormsModule, TranslocoPipe, TagPickerComponent, DomainEntryFormOverlayComponent],
  templateUrl: './association-entry-form.component.html',
})
export class AssociationEntryFormComponent {
  readonly form = input.required<AssociationsComponent>();
}
