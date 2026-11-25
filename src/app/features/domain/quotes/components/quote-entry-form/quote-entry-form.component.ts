import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagPickerComponent } from '../../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { QuotesComponent } from '../../quotes/quotes.component';

@Component({
  selector: 'app-quote-entry-form-1',
  imports: [FormsModule, TranslocoPipe, TagPickerComponent, DomainEntryFormOverlayComponent],
  templateUrl: './quote-entry-form.component.html',
})
export class QuoteEntryFormComponent {
  readonly form = input.required<QuotesComponent>();
}
