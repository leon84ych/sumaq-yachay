import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@jsverse/transloco';
import { ConfigService } from '../../../core/services/config.service';
import { CatalogService } from '../../catalog/services/catalog.service';
import { CatalogOverviewComponent } from '../components/catalog-overview/catalog-overview.component';
import { CatalogSheetTabsComponent } from '../components/catalog-sheet-tabs/catalog-sheet-tabs.component';
import { SheetViewResolverComponent } from '../components/sheet-view-resolver/sheet-view-resolver.component';
import { DomainDataService } from '../services/domain-data.service';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { ALL_AVAILABLE_DOMAINS, getDefaultHeadersForDomain } from '../models/domain-sheet-config';

@Component({
  selector: 'app-catalog-detail',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoPipe,
    CatalogOverviewComponent,
    CatalogSheetTabsComponent,
    SheetViewResolverComponent,
  ],
  templateUrl: './catalog-detail.html',
  styleUrl: './catalog-detail.css',
})
export class CatalogDetail {
  private route = inject(ActivatedRoute);
  readonly catalogService = inject(CatalogService);
  readonly domainDataService = inject(DomainDataService);
  readonly configService = inject(ConfigService);
  private readonly globalErrorService = inject(GlobalErrorService);

  private readonly paramMap = toSignal(this.route.paramMap);

  readonly itemId = computed(() => this.paramMap()?.get('id') ?? null);

  readonly item = computed(
    () => this.catalogService.items().find((i) => i.id === this.itemId()) ?? null,
  );

  readonly activeSheetName = signal<string | null>(null);

  readonly activeSheet = computed(
    () => this.domainDataService.sheets().find((s) => s.name === this.activeSheetName()) ?? null,
  );

  readonly isAddingEntry = signal<boolean>(false);
  readonly isAddingDomain = signal(false);
  readonly isCreatingDomain = signal(false);
  readonly availableDomains = computed(() => {
    const existingDomains = new Set(
      this.domainDataService.sheetNames().map((name) => name.toUpperCase()),
    );
    return ALL_AVAILABLE_DOMAINS.filter((domain) => !existingDomains.has(domain));
  });

  constructor() {
    // Load the entry's Domain Data Sheets whenever the routed id changes.
    effect(() => {
      const row = this.item()?.row;
      if (row !== undefined && row !== null) {
        this.activeSheetName.set(null);
        void this.domainDataService.loadForCatalog(row);
      }
    });

    // Default to the first available sheet tab once sheets arrive.
    effect(() => {
      const names = this.domainDataService.sheetNames();
      if (names.length > 0 && !this.activeSheetName()) {
        this.activeSheetName.set(names[0]);
      }
    });
  }

  selectTab(name: string): void {
    this.activeSheetName.set(name);
  }

  toggleAddingEntry(): void {
    this.isAddingEntry.update((isAddingEntry) => !isAddingEntry);
  }

  async onDomainSelected(domainName: string): Promise<void> {
    if (!domainName || this.isCreatingDomain()) {
      return;
    }

    this.isCreatingDomain.set(true);
    try {
      await this.domainDataService.createDomainSheet(domainName, [
        ...getDefaultHeadersForDomain(domainName),
      ]);
      this.activeSheetName.set(domainName);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create domain sheet.';
      this.globalErrorService.show(message);
    } finally {
      this.isCreatingDomain.set(false);
      this.isAddingDomain.set(false);
    }
  }
}
