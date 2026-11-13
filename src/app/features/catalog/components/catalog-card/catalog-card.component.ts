import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { CatalogSyncBadgeComponent } from '../catalog-sync-badge/catalog-sync-badge.component';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { CatalogRecord } from '../../models/catalog-item.model';

@Component({
  selector: 'app-catalog-card',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslocoPipe, CatalogSyncBadgeComponent],
  templateUrl: './catalog-card.component.html', // Fixed property name
  styleUrls: ['./catalog-card.component.css'],  // Fixed property name and converted to array
})
export class CatalogCardComponent {
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;
  readonly item = input.required<CatalogRecord>();
  readonly highlighted = input(false);
  readonly progress = computed(() => {
    const { page, pages } = this.item();
    return pages > 0 ? Math.min(100, Math.max(0, Math.round((page / pages) * 100))) : 0;
  });
  readonly toggleActive = output<CatalogRecord>();
  readonly edit = output<CatalogRecord>();
  readonly delete = output<string>();
}

