import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagPickerComponent } from '../../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { DomainPassageComponent } from '../../domain-passage/domain-passage.component';

@Component({
  selector: 'app-passage-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    TagPickerComponent,
    DomainEntryFormOverlayComponent,
  ],
  templateUrl: './passage-form.component.html',
  styleUrl: './passage-form.component.css',
})
export class PassageFormComponent {
  readonly form = input.required<DomainPassageComponent>();
}
