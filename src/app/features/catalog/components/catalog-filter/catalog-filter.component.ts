import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-catalog-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe],
  templateUrl: './catalog-filter.component.html', 
  styleUrls: ['./catalog-filter.component.css'],
})
export class CatalogFilterComponent {
  // Current Filter State
  readonly selectedSubject = input<string>('ALL');
  readonly searchQuery = input<string>('');
  readonly showActiveOnly = input<boolean>(false);

  // Dynamic Live Statistics Counters
  readonly totalCount = input<number>(0);
  
  /**
   * Expects a dictionary mapping your dynamic subjects to their counts:
   * e.g., { "Philosophy": 5, "Technical": 12, "Narrative": 2 }
   */
  readonly subjectCounts = input<Record<string, number>>({});

  // State Change Notification Channels
  readonly subjectChange = output<string>();
  readonly searchChange = output<string>();
  readonly activeOnlyChange = output<boolean>();
}