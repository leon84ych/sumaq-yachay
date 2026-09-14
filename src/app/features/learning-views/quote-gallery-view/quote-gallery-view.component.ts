import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuoteRow } from '../../catalog-detail/models/domain-sheet.model';

@Component({
  selector: 'app-quote-gallery-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quote-gallery-view.component.html',
  styleUrls: ['./quote-gallery-view.component.css'],
})
export class QuoteGalleryViewComponent {
  readonly rows = input.required<QuoteRow[]>();
}
