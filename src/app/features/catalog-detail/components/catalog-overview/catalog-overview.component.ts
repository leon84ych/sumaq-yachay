import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CatalogItem } from '../../../catalog/models/catalog-item.model';

@Component({
  selector: 'app-catalog-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './catalog-overview.component.html',
  styleUrls: ['./catalog-overview.component.css'],
})
export class CatalogOverviewComponent {
  readonly item = input.required<CatalogItem>();
}
