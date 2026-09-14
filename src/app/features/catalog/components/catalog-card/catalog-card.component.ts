import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { CatalogItem } from '../../models/catalog-item.model';
import { CatalogSyncBadgeComponent } from '../catalog-sync-badge/catalog-sync-badge.component';

@Component({
  selector: 'app-catalog-card',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslocoPipe, CatalogSyncBadgeComponent],
  templateUrl: './catalog-card.component.html', // Fixed property name
  styleUrls: ['./catalog-card.component.css'],  // Fixed property name and converted to array
})
export class CatalogCardComponent {
  readonly item = input.required<CatalogItem>();
  readonly toggleActive = output<CatalogItem>();
  readonly edit = output<CatalogItem>();
  readonly delete = output<string>();
}

