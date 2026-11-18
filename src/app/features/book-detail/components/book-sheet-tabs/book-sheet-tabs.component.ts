import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-book-sheet-tabs',
  standalone: true,
  imports: [CommonModule, TranslocoPipe],
  templateUrl: './book-sheet-tabs.component.html',
  styleUrls: ['./book-sheet-tabs.component.css'],
})
export class BookSheetTabsComponent {
  
  readonly sheetNames = input.required<string[]>();
  readonly activeSheetName = input<string | null>(null);
  readonly selectTab = output<string>();

}
