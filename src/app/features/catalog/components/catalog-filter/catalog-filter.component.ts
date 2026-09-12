import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { CatalogCategory } from '../../models/catalog-item.model';

@Component({
  selector: 'app-catalog-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe],
  template: `
    <div class="filter-panel">
      <!-- Search Input -->
      <div class="search-box">
        <svg class="search-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
        </svg>
        <input
          type="text"
          [placeholder]="'CATALOG.FILTER.SEARCH_PLACEHOLDER' | transloco"
          [ngModel]="searchQuery()"
          (ngModelChange)="searchChange.emit($event)"
          class="search-input"
        />
        @if (searchQuery()) {
          <button class="clear-btn" (click)="searchChange.emit('')" title="Clear search">✕</button>
        }
      </div>

      <!-- Category Filter Pills -->
      <div class="filter-controls">
        <div class="category-pills">
          <button
            type="button"
            class="pill"
            [class.active]="selectedCategory() === 'ALL'"
            (click)="categoryChange.emit('ALL')"
          >
            {{ 'CATALOG.FILTER.ALL' | transloco }}
            <span class="count-badge">{{ totalCount() }}</span>
          </button>

          <button
            type="button"
            class="pill pill-tech"
            [class.active]="selectedCategory() === 'Technical'"
            (click)="categoryChange.emit('Technical')"
          >
            {{ 'CATALOG.FILTER.TECHNICAL' | transloco }}
            <span class="count-badge">{{ techCount() }}</span>
          </button>

          <button
            type="button"
            class="pill pill-phil"
            [class.active]="selectedCategory() === 'Philosophy'"
            (click)="categoryChange.emit('Philosophy')"
          >
            {{ 'CATALOG.FILTER.PHILOSOPHY' | transloco }}
            <span class="count-badge">{{ philCount() }}</span>
          </button>

          <button
            type="button"
            class="pill pill-fict"
            [class.active]="selectedCategory() === 'Fiction'"
            (click)="categoryChange.emit('Fiction')"
          >
            {{ 'CATALOG.FILTER.FICTION' | transloco }}
            <span class="count-badge">{{ fictCount() }}</span>
          </button>
        </div>

        <!-- Active Only Toggle -->
        <label class="toggle-container">
          <input
            type="checkbox"
            [checked]="showActiveOnly()"
            (change)="activeOnlyChange.emit($any($event.target).checked)"
          />
          <span class="toggle-label">{{ 'CATALOG.FILTER.ACTIVE_ONLY' | transloco }}</span>
        </label>
      </div>
    </div>
  `,
  styles: [`
    .filter-panel {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      box-shadow: var(--shadow-sm);
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      width: 18px;
      height: 18px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 0.65rem 2.25rem 0.65rem 2.5rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 0.95rem;
      color: var(--text);
      background-color: var(--background);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(31, 85, 99, 0.15);
      background-color: var(--surface);
    }

    .clear-btn {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.85rem;
      padding: 4px;
    }

    .filter-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .category-pills {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0.4rem 0.85rem;
      border-radius: var(--radius-full);
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .pill:hover {
      background: var(--background);
      border-color: var(--text-muted);
    }

    .pill.active {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
    }

    .count-badge {
      font-size: 0.75rem;
      padding: 1px 6px;
      border-radius: var(--radius-full);
      background: rgba(0, 0, 0, 0.08);
    }

    .pill.active .count-badge {
      background: rgba(255, 255, 255, 0.25);
    }

    .toggle-container {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--text);
      user-select: none;
    }

    .toggle-container input[type="checkbox"] {
      accent-color: var(--primary);
      width: 16px;
      height: 16px;
      cursor: pointer;
    }
  `],
})
export class CatalogFilterComponent {
  readonly selectedCategory = input<CatalogCategory | 'ALL'>('ALL');
  readonly searchQuery = input<string>('');
  readonly showActiveOnly = input<boolean>(false);
  readonly totalCount = input<number>(0);
  readonly techCount = input<number>(0);
  readonly philCount = input<number>(0);
  readonly fictCount = input<number>(0);

  readonly categoryChange = output<CatalogCategory | 'ALL'>();
  readonly searchChange = output<string>();
  readonly activeOnlyChange = output<boolean>();
}
