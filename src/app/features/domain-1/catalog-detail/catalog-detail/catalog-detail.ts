import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@jsverse/transloco';

import { CatalogSheetTabsComponent } from '../components/catalog-sheet-tabs/catalog-sheet-tabs.component';
import { DomainViewResolverComponent } from '../components/domain-view-resolver/domain-view-resolver.component';
import { DomainDataService } from '../services/domain-data.service';
import { ALL_AVAILABLE_DOMAINS, getDefaultHeadersForDomain } from '../models/domain-sheet-config';
import { CatalogService } from '../../../catalog/services/catalog.service';
import { ConfigService } from '../../../../core/services/config/config.service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { GlobalErrorService } from '../../../../core/services/error/global-error.service';


@Component({
  selector: 'app-catalog-detail',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoPipe,
    CatalogSheetTabsComponent,
    DomainViewResolverComponent,
  ],
  templateUrl: './catalog-detail.html',
  styleUrl: './catalog-detail.css',
})
export class CatalogDetail {
  private route = inject(ActivatedRoute);


  readonly catalogService = inject(CatalogService);
  readonly domainDataService = inject(DomainDataService);
  
  readonly configService = inject(ConfigService);
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;
  private readonly globalErrorService = inject(GlobalErrorService);

  private readonly paramMap = toSignal(this.route.paramMap);

  readonly itemId = computed(() => this.paramMap()?.get('id') ?? null);

  readonly item = computed(
    () => this.catalogService.items().find((i) => i.id === this.itemId()) ?? null,
  );

  readonly activeDomainName = signal<string | null>(null);

  readonly activeDomain = computed(
    () => this.domainDataService.domainsInfo().find((s) => s.id === this.activeDomainName()) ?? null,
  );

  readonly isAddingEntry = signal<boolean>(false);
  readonly isAddingDomain = signal(false);
  readonly isCreatingDomain = signal(false);
  readonly availableDomains = computed(() => {
     const existingDomains = new Set(
       this.domainDataService.domainsInfo().map((domain) => domain.id.toUpperCase()),
     );
    return ALL_AVAILABLE_DOMAINS.filter((domain) => !existingDomains.has(domain));
  });

  constructor() {
    // Load the entry's Domain Data Sheets whenever the routed id changes.
    effect(() => {
      const row = this.item()?.row;
      if (row !== undefined && row !== null) {
        this.activeDomainName.set(null);
        void this.domainDataService.loadForCatalog(row);
      }
    });

    // Default to the first available sheet tab once sheets arrive.
    effect(() => {
      const names = this.domainDataService.domainsNames();
      if (names.length > 0 && !this.activeDomainName()) {
        this.activeDomainName.set(names[0]);
      }
    });
  }

  selectTab(name: string): void {
    this.activeDomainName.set(name);
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
      this.activeDomainName.set(domainName);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create domain sheet.';
      this.globalErrorService.show(message);
    } finally {
      this.isCreatingDomain.set(false);
      this.isAddingDomain.set(false);
    }
  }
}
