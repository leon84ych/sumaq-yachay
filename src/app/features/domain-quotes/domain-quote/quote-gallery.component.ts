import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuoteRow } from '../../catalog-detail/models/domain-sheet.model';

@Component({
  selector: 'app-quote-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quote-gallery.component.html',
  styleUrls: ['./quote-gallery.component.css'],
})
export class QuoteGalleryComponent {
  readonly rows = input.required<QuoteRow[]>();
}
