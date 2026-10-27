import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagPickerComponent } from '../../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { DomainGlossaryComponent } from '../../domain-glosary/domain-glossary.component';

@Component({
  selector: 'app-glossary-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    TagPickerComponent,
    DomainEntryFormOverlayComponent,
  ],
  templateUrl: './glossary-form.component.html',
})
export class GlossaryFormComponent {
  readonly form = input.required<DomainGlossaryComponent>();
}
