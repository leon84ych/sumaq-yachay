import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { SyncState } from '../../models/catalog-item.model';

@Component({
  selector: 'app-catalog-sync-badge',
  standalone: true,
  imports: [CommonModule, TranslocoPipe],
  template: `
    <span class="sync-badge" [ngClass]="'status-' + (status() || 'synced')">
      @switch (status()) {
        @case ('pending') {
          <span class="dot pulse"></span> {{ 'CATALOG.SYNC_STATUS.PENDING' | transloco }}
        }
        @case ('error') {
          <span class="dot error"></span> {{ 'CATALOG.SYNC_STATUS.FAILED' | transloco }}
        }
        @default {
          <span class="dot synced"></span> {{ 'CATALOG.SYNC_STATUS.SYNCED' | transloco }}
        }
      }
    </span>
  `,
  styles: [`
    .sync-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      display: inline-block;
    }

    .status-synced {
      background-color: var(--success-light);
      color: var(--success);
    }
    .status-synced .dot {
      background-color: var(--success);
    }

    .status-pending {
      background-color: var(--warning-light);
      color: #926a11;
    }
    .status-pending .dot {
      background-color: var(--warning);
    }

    .status-error {
      background-color: var(--error-light);
      color: var(--error);
    }
    .status-error .dot {
      background-color: var(--error);
    }

    @keyframes pulse-anim {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.2); }
      100% { opacity: 1; transform: scale(1); }
    }

    .pulse {
      animation: pulse-anim 1.5s infinite ease-in-out;
    }
  `],
})
export class CatalogSyncBadgeComponent {
  readonly status = input<SyncState | undefined>('synced');
}
