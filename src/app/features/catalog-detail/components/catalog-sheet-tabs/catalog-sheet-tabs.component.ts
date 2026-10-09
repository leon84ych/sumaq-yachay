import { Component, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../../core/services/global-error.service';
import { DomainDataService } from '../../services/domain-data.service';
import {
  ALL_AVAILABLE_DOMAINS,
  getDefaultHeadersForDomain,
} from '../../models/domain-sheet-config';

@Component({
  selector: 'app-catalog-sheet-tabs',
  standalone: true,
  imports: [CommonModule, TranslocoPipe],
  templateUrl: './catalog-sheet-tabs.component.html',
  styleUrls: ['./catalog-sheet-tabs.component.css'],
})
export class CatalogSheetTabsComponent {
  private domainDataService = inject(DomainDataService);
  private globalErrorService = inject(GlobalErrorService);

  readonly sheetNames = input.required<string[]>();
  readonly activeSheetName = input<string | null>(null);

  readonly selectTab = output<string>();
  readonly addSheet = output<string>();
  readonly addEntry = output<void>();

  // Computed property that filters out domains that have already been created as sheets
  readonly availableDomains = computed(() => {
    const existing = this.sheetNames().map(name => name.toUpperCase());
    return ALL_AVAILABLE_DOMAINS.filter(domain => !existing.includes(domain));
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
      const headers = getDefaultHeadersForDomain(domainName);
      await this.domainDataService.createDomainSheet(domainName, [...headers]);

      this.addSheet.emit(domainName);
      this.selectTab.emit(domainName);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create domain sheet.';
      this.globalErrorService.show(errorMessage);
      console.error('Failed to create domain sheet:', err);
    } finally {
      this.isCreating.set(false);
      this.toggleAddMode(false);
    }
  }
}