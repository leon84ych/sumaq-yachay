import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagPickerComponent } from '../../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { PassagesComponent } from '../../passages/passages.component';

@Component({
  selector: 'app-passage-form-1',
  imports: [FormsModule, TranslocoPipe, TagPickerComponent, DomainEntryFormOverlayComponent],
  templateUrl: './passage-form.component.html',
  styleUrl: './passage-form.component.css',
})
export class PassageFormComponent {
  readonly form = input.required<PassagesComponent>();
}
