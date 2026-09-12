import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { CatalogItem } from '../../models/catalog-item.model';
import { CatalogSyncBadgeComponent } from '../catalog-sync-badge/catalog-sync-badge.component';

@Component({
  selector: 'app-catalog-card',
  standalone: true,
  imports: [CommonModule, TranslocoPipe, CatalogSyncBadgeComponent],
  template: `
    <div class="card" [class.inactive]="!item().active">
      <!-- Card Header -->
      <div class="card-header">
        <div class="badges">
          <span class="category-badge" [ngClass]="'cat-' + item().category.toLowerCase()">
            {{ 'CATALOG.FILTER.' + item().category.toUpperCase() | transloco }}
          </span>
          <span class="type-badge">{{ item().type }}</span>
        </div>
        <app-catalog-sync-badge [status]="item().syncStatus" />
      </div>

      <!-- Card Body -->
      <div class="card-body">
        <h3 class="card-title">{{ item().name }}</h3>
        <p class="card-desc">{{ item().description || ('CATALOG.CARD.NO_DESCRIPTION' | transloco) }}</p>

        <div class="sheet-meta">
          <svg class="meta-icon" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
          </svg>
          <span class="sheet-id" title="{{ item().sheetId }}">
            ID: {{ item().sheetId | slice:0:16 }}...
          </span>
        </div>
      </div>

      <!-- Card Footer -->
      <div class="card-footer">
        <label class="active-toggle" title="Toggle active in Master Index">
          <input
            type="checkbox"
            [checked]="item().active"
            (change)="toggleActive.emit(item())"
          />
          <span class="status-label">{{ (item().active ? 'CATALOG.CARD.ACTIVE' : 'CATALOG.CARD.INACTIVE') | transloco }}</span>
        </label>

        <div class="card-actions">
          <button type="button" class="btn-action edit" (click)="edit.emit(item())" [title]="'CATALOG.CARD.EDIT' | transloco">
            {{ 'CATALOG.CARD.EDIT' | transloco }}
          </button>
          <button type="button" class="btn-action delete" (click)="delete.emit(item().id)" [title]="'CATALOG.CARD.DELETE' | transloco">
            {{ 'CATALOG.CARD.DELETE' | transloco }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      box-shadow: var(--shadow-sm);
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      position: relative;
    }

    .card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
      border-color: var(--primary);
    }

    .card.inactive {
      opacity: 0.7;
      background: #fafbfb;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.85rem;
    }

    .badges {
      display: flex;
      gap: 0.4rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .category-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .cat-technical {
      background-color: var(--primary-light);
      color: var(--primary);
    }

    .cat-philosophy {
      background-color: var(--secondary-light);
      color: var(--secondary);
    }

    .cat-fiction {
      background-color: var(--accent-light);
      color: #8c630b;
    }

    .type-badge {
      font-size: 0.75rem;
      font-weight: 500;
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      background-color: var(--background);
      color: var(--text-muted);
      border: 1px solid var(--border);
      text-transform: capitalize;
    }

    .card-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .card-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text);
      line-height: 1.35;
    }

    .card-desc {
      font-size: 0.875rem;
      color: var(--text-muted);
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .sheet-meta {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.78rem;
      color: var(--text-muted);
      margin-top: 0.5rem;
      background: var(--background);
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      align-self: flex-start;
    }

    .meta-icon {
      width: 14px;
      height: 14px;
      color: var(--primary);
    }

    .sheet-id {
      font-family: monospace;
      letter-spacing: 0.02em;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1.25rem;
      padding-top: 0.85rem;
      border-top: 1px solid var(--border);
    }

    .active-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.825rem;
      font-weight: 500;
      cursor: pointer;
      user-select: none;
    }

    .active-toggle input[type="checkbox"] {
      accent-color: var(--secondary);
      width: 15px;
      height: 15px;
      cursor: pointer;
    }

    .card-actions {
      display: flex;
      gap: 0.4rem;
    }

    .btn-action {
      background: none;
      border: 1px solid var(--border);
      padding: 4px 10px;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-action.edit {
      color: var(--primary);
    }

    .btn-action.edit:hover {
      background: var(--primary-light);
      border-color: var(--primary);
    }

    .btn-action.delete {
      color: var(--error);
    }

    .btn-action.delete:hover {
      background: var(--error-light);
      border-color: var(--error);
    }
  `],
})
export class CatalogCardComponent {
  readonly item = input.required<CatalogItem>();

  readonly toggleActive = output<CatalogItem>();
  readonly edit = output<CatalogItem>();
  readonly delete = output<string>();
}
