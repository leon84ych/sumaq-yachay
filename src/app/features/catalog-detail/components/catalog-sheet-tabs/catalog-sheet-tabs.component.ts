import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-catalog-sheet-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './catalog-sheet-tabs.component.html',
  styleUrls: ['./catalog-sheet-tabs.component.css'],
})
export class CatalogSheetTabsComponent {
  readonly sheetNames = input.required<string[]>();
  readonly activeSheetName = input<string | null>(null);
  readonly selectTab = output<string>();
}
