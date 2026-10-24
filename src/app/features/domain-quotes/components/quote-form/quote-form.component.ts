import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagPickerComponent } from '../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../../shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { DomainQuoteComponent } from '../../domain-quote/domain-quote.component';

@Component({
  selector: 'app-quote-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    TagPickerComponent,
    DomainEntryFormOverlayComponent,
  ],
  templateUrl: './quote-form.component.html',
})
export class QuoteFormComponent {
  readonly form = input.required<DomainQuoteComponent>();
}
