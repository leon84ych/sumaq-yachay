import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagPickerComponent } from '../../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../../domain/shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { GlossaryComponent } from '../../glossary/glossary.component';

@Component({
  selector: 'app-glossary-entry-form-1',
  imports: [FormsModule, TranslocoPipe, TagPickerComponent, DomainEntryFormOverlayComponent],
  templateUrl: './glossary-entry-form.component.html',
})
export class GlossaryEntryFormComponent {
  readonly form = input.required<GlossaryComponent>();
}
