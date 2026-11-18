import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookRecord } from '../../../book/models/book-item.model';

@Component({
  selector: 'app-book-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './book-overview.component.html',
  styleUrls: ['./book-overview.component.css'],
})
export class BookOverviewComponent {
  readonly item = input.required<BookRecord>();
}
