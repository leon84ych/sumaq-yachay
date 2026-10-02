import { Component, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { DomainDataService } from '../../services/domain-data.service';

@Component({
  selector: 'app-catalog-sheet-tabs',
  standalone: true,
  imports: [CommonModule, TranslocoPipe],
  templateUrl: './catalog-sheet-tabs.component.html',
  styleUrls: ['./catalog-sheet-tabs.component.css'],
})
export class CatalogSheetTabsComponent {
  private domainDataService = inject(DomainDataService);

  readonly sheetNames = input.required<string[]>();
  readonly activeSheetName = input<string | null>(null);
  
  readonly selectTab = output<string>();
  readonly addSheet = output<string>();

  // Full master list of all available domain types
  private readonly allAvailableDomains = [
      'INDEX',
      'QUOTES',
      'TIMELINE',
      'RELATIONS',
      'CONCEPTS',
      'GLOSARY',
      'QUESTIONS'
  ];

  // Computed property that filters out domains that have already been created as sheets
  readonly availableDomains = computed(() => {
    const existing = this.sheetNames().map(name => name.toUpperCase());
    return this.allAvailableDomains.filter(domain => !existing.includes(domain));
  });

  readonly isAdding = signal<boolean>(false);
  readonly isCreating = signal<boolean>(false);

  toggleAddMode(show: boolean) {
    this.isAdding.set(show);
  }

  async onDomainSelected(domainName: string) {
    if (!domainName) return;

    this.isCreating.set(true);
    try {
      const headers = this.getDefaultHeadersForDomain(domainName);
      await this.domainDataService.createDomainSheet(domainName, headers);

      this.addSheet.emit(domainName);
      this.selectTab.emit(domainName);
    } catch (err) {
      console.error('Failed to create domain sheet:', err);
    } finally {
      this.isCreating.set(false);
      this.toggleAddMode(false);
    }
  }

private getDefaultHeadersForDomain(domain: string): string[] {
    switch (domain) {
      case 'INDEX':
        return ['id', 'chapter', 'theme', 'subtheme', 'tag', 'syncStatus'];
      case 'QUOTES':
        return ['id', 'quote', 'author', 'page', 'tags', 'syncStatus'];
      case 'TIMELINE':
        return ['id', 'date', 'event', 'description', 'significance', 'syncStatus'];
      case 'GLOSARY':
        return ['id', 'label', 'definition', 'examples', 'syncStatus'];
      case 'CONCEPTS':
        return ['id', 'term', 'definition', 'category', 'source', 'syncStatus'];
      case 'RELATIONS':
        return ['id', 'sourceNode', 'targetNode', 'relationshipType', 'weight', 'syncStatus'];
      case 'QUESTIONS':
        return ['id', 'question', 'answer', 'difficulty', 'status', 'syncStatus'];
      default:
        // Fallback for any unknown domain
        return ['id', 'tag', 'syncStatus']; 
    }
  }
}