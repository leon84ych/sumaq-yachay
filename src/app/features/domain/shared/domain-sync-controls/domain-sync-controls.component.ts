import { Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-domain-sync-controls',
  imports: [TranslocoPipe],
  template: `
    @if (status() || pendingDeletion() || canRetry()) {
      <div class="sync-controls">
        @if (status()) {
          <span role="status">{{ 'COMMON.STATUS.' + status() | transloco }}</span>
        }
        @if (pendingDeletion()) {
          <span role="status">{{ 'DOMAINS.INDEX.DELETE_PENDING' | transloco }}</span>
        }
        @if (canRetry()) {
          <button type="button" (click)="retryRequested.emit()">
            {{
              (pendingDeletion() ? 'DOMAINS.INDEX.RETRY_DELETE' : 'COMMON.RETRY_SYNC') | transloco
            }}
          </button>
        }
      </div>
    }
  `,
  styles: [
    `
      .sync-controls {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-top: 0.5rem;
        color: var(--text-muted);
        font-size: 0.8rem;
      }
      button {
        padding: 0.25rem 0.5rem;
        border: 1px solid var(--border);
        border-radius: 0.35rem;
        background: var(--surface);
        color: var(--text);
        font: inherit;
        cursor: pointer;
      }
    `,
  ],
})
export class DomainSyncControlsComponent {
  readonly status = input<string | null>(null);
  readonly canRetry = input(false);
  readonly pendingDeletion = input(false);
  readonly retryRequested = output<void>();
}
