import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { liveQuery } from 'dexie';
import { TranslocoPipe } from '@jsverse/transloco';
import { LocalDBService } from '../../../shared/local-db/local-db.service';

@Component({
  selector: 'app-sync',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './sync.component.html',
  styleUrl: './sync.component.css',
})
export class SyncComponent {
  private readonly database = inject(LocalDBService).indexedDB;

  private readonly unsyncedCountSignal = toSignal<number>(
    liveQuery<number>(async () => {
      const counts = await Promise.all(
        this.database.tables.map((table) =>
          table
            .toCollection()
            .filter((record) => {
              const status = (record as { syncStatus?: string }).syncStatus;
              return status === 'pending' || status === 'error';
            })
            .count(),
        ),
      );
      return counts.reduce((total, count) => total + count, 0);
    }),
  );
  readonly unsyncedCount = computed(() => this.unsyncedCountSignal() ?? 0);

  readonly badgeText = computed(() => {
    const count = this.unsyncedCount();
    return count > 99 ? '99+' : String(count);
  });
}