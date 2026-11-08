import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CatalogRecord } from '../../../catalog/models/catalog-item.model';

@Component({
  selector: 'app-catalog-overview-1',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './catalog-overview.component.html',
  styleUrls: ['./catalog-overview.component.css'],
})
export class CatalogOverviewComponent {
  readonly item = input.required<CatalogRecord>();
}
