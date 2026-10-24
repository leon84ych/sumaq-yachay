import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagPickerComponent } from '../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../../shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { DomainIndexComponent } from '../../domain-index/domain-index.component';

@Component({
  selector: 'app-index-entry-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    TagPickerComponent,
    DomainEntryFormOverlayComponent,
  ],
  templateUrl: './index-entry-form.component.html',
})
export class IndexEntryFormComponent {
  readonly form = input.required<DomainIndexComponent>();
}
