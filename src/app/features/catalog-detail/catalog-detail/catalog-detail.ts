import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@jsverse/transloco';
import { CatalogService } from '../../catalog/services/catalog.service';
import { CatalogOverviewComponent } from '../components/catalog-overview/catalog-overview.component';
import { CatalogSheetTabsComponent } from '../components/catalog-sheet-tabs/catalog-sheet-tabs.component';
import { SheetViewResolverComponent } from '../components/sheet-view-resolver/sheet-view-resolver.component';
import { DomainDataService } from '../services/domain-data.service';

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

  private readonly paramMap = toSignal(this.route.paramMap);

  readonly itemId = computed(() => this.paramMap()?.get('id') ?? null);

  readonly item = computed(
    () => this.catalogService.items().find((i) => i.id === this.itemId()) ?? null
  );

  readonly activeSheetName = signal<string | null>(null);

  readonly activeSheet = computed(
    () => this.domainDataService.sheets().find((s) => s.name === this.activeSheetName()) ?? null
  );

  constructor() {
    // Load the entry's Domain Data Sheets whenever the routed id changes.
    effect(() => {
      const id = this.itemId();
      if (id) {
        this.activeSheetName.set(null);
        void this.domainDataService.loadForCatalog(id);
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
}

