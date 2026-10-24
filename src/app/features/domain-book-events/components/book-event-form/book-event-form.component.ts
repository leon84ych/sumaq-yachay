import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagPickerComponent } from '../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../../shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { DomainBookEventsComponent } from '../../domain-book-events/domain-book-events.component';

@Component({
  selector: 'app-book-event-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    TagPickerComponent,
    DomainEntryFormOverlayComponent,
  ],
  templateUrl: './book-event-form.component.html',
  styleUrl: './book-event-form.component.css',
})
export class BookEventFormComponent {
  readonly form = input.required<DomainBookEventsComponent>();
}
