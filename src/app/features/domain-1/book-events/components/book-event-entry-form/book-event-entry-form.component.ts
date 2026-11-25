import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagPickerComponent } from '../../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../../domain/shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { BookEventsComponent } from '../../book-events/book-events.component';

@Component({
  selector: 'app-book-event-entry-form-1',
  imports: [FormsModule, TranslocoPipe, TagPickerComponent, DomainEntryFormOverlayComponent],
  templateUrl: './book-event-entry-form.component.html',
  styleUrl: './book-event-entry-form.component.css',
})
export class BookEventEntryFormComponent {
  readonly form = input.required<BookEventsComponent>();
}
