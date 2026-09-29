import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-catalog-sheet-tabs',
  standalone: true,
  imports: [CommonModule, TranslocoPipe],
  templateUrl: './catalog-sheet-tabs.component.html',
  styleUrls: ['./catalog-sheet-tabs.component.css'],
})
export class CatalogSheetTabsComponent {
  readonly sheetNames = input.required<string[]>();
  readonly activeSheetName = input<string | null>(null);
  
  readonly selectTab = output<string>();
  readonly addSheet = output<string>(); // Emits the selected domain name to create

  // Predefined available domains for study
  readonly availableDomains = [
      'INDEX',
      'QUOTES',
      'TIMELINE',
      'RELATIONS',
      'CONCEPTS',
      'GLOSARY',
      'QUESTIONS'
  ];

  readonly isAdding = signal<boolean>(false);

  toggleAddMode(show: boolean) {
    this.isAdding.set(show);
  }

  onDomainSelected(domainName: string) {
    if (domainName) {
      this.addSheet.emit(domainName);
      this.toggleAddMode(false);
    }
  }
}