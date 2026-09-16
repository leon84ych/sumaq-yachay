import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppDbService } from '../../../core/services/storage/app-db.service';
import { CatalogApiService } from './catalog-api.service';
import { CatalogItem } from '../models/catalog-item.model';
import { CatalogPostPayload } from '../models/catalog-api.model';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';

@Injectable({
  providedIn: 'root',
})
export class CatalogService {
  private dbService = inject(AppDbService);
  private apiService = inject(CatalogApiService);
  private authService = inject(GoogleAuthService);

  // State Signals
  readonly items = signal<CatalogItem[]>([]);
  readonly selectedSubject = signal<string>('ALL');
  readonly searchQuery = signal<string>('');
  readonly showActiveOnly = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly lastSyncedAt = signal<string | null>(null);

  // Computed Derived State
  readonly filteredItems = computed(() => {
    const list = this.items();
    const subject = this.selectedSubject();
    const query = this.searchQuery().toLowerCase().trim();
    const activeOnly = this.showActiveOnly();

    return list.filter((item) => {
      const matchesSubject = subject === 'ALL' || item.subject === subject;
      const matchesActive = !activeOnly || item.active;
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.subject.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query));

      return matchesSubject && matchesActive && matchesQuery;
    });
  });

  readonly stats = computed(() => {
    const all = this.items();

    let total = 0;
    let active = 0;
    let pendingSync = 0;

    const subjects: Record<string, number> = {};

    for (const item of all) {
      total++;
      if (item.active) active++;
      if (item.syncStatus === 'pending' || item.syncStatus === 'error') pendingSync++;
      const subjectKey = item.subject?.trim() || 'Unknown';
      subjects[subjectKey] = (subjects[subjectKey] || 0) + 1;
    }

    return {
      total,
      active,
      pendingSync,
      subjects // This contains your dynamic counts per subject
    };
  });

  constructor() {
    this.init();
  }

  async init(): Promise<void> {
    await this.loadFromLocal();
  }

  /**
   * Load stored items from IndexedDB
   */
  async loadFromLocal(): Promise<void> {
    try {
      const localItems = await this.dbService.db.catalogs.toArray();
      if (localItems.length > 0) {
        this.items.set(localItems);
      } else {
        // Seed default template items if database is freshly initialized
        await this.seedInitialData();
      }
    } catch (err) {
      console.error('Failed to load catalogs from IndexedDB:', err);
    }
  }

  /**
   * HTTP GET: Syncs the catalog from Google Apps Script Web App
   */
  async syncFromRemote(): Promise<void> {
    // Check authentication state before making the network call
    if (!this.authService.idToken()) {
      this.errorMessage.set('CATALOG.ERRORS.authRequired');
      console.warn('Sync aborted: User is not authenticated with Google.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const response = await firstValueFrom(this.apiService.getCatalog());
      if (response && response.status === 'success' && Array.isArray(response.data)) {
        const normalized: CatalogItem[] = response.data.map((item) => ({
          ...item,
          syncStatus: 'synced',
        }));

        await this.dbService.db.transaction('rw', this.dbService.db.catalogs, async () => {
          await this.dbService.db.catalogs.clear();
          await this.dbService.db.catalogs.bulkPut(normalized);
        });

        this.items.set(normalized);
        this.lastSyncedAt.set(new Date().toLocaleTimeString());
      } else {
        throw new Error(response.message || 'CATALOG.ERRORS.malformedCatalog');
      }
    } catch (err: unknown) {
      this.errorMessage.set('CATALOG.ERRORS.syncFailed');
      console.warn('Sync from remote failed; maintaining local cache:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * HTTP POST: Optimistically save or update an item locally and push to Google Sheets
   */
  async saveItem(itemInput: Omit<CatalogItem, 'updatedAt' | 'syncStatus'>, isEdit: boolean): Promise<void> {
    const now = new Date().toISOString();
    const item: CatalogItem = {
      ...itemInput,
      updatedAt: now,
      syncStatus: 'pending',
    };

    // 1. Optimistic local update
    await this.dbService.db.catalogs.put(item);
    this.updateLocalItemInState(item);

    // 2. Prepare POST payload for Apps Script
    const payload: CatalogPostPayload = {
      action: isEdit ? 'UPDATE_CATALOG_ITEM' : 'CREATE_CATALOG_ITEM',
      id: item.id,
      row: item.row,
      rowValues: [
        item.id,
        item.subject,
        item.topic,
        item.name,
        item.author,
        item.description || '',
        item.source || '',
        item.active
      ],
    };

    // 3. Send over HTTP POST to GAS
    try {
      const res = await firstValueFrom(this.apiService.saveCatalogItem(payload));
      if (res && res.status === 'success') {
        const syncedItem: CatalogItem = { ...item, syncStatus: 'synced' };
        await this.dbService.db.catalogs.put(syncedItem);
        this.updateLocalItemInState(syncedItem);
      } else {
        throw new Error(res?.message || 'Remote save failed');
      }
    } catch (err: unknown) {
      console.error('Remote POST save failed, marked as error/pending:', err);
      const errorItem: CatalogItem = { ...item, syncStatus: 'error' };
      await this.dbService.db.catalogs.put(errorItem);
      this.updateLocalItemInState(errorItem);
    }
  }

  /**
   * Toggle the active status of a catalog item
   */
  async toggleActive(item: CatalogItem): Promise<void> {
    const updated: CatalogItem = {
      ...item,
      active: !item.active,
    };
    await this.saveItem(updated, true);
  }

  /**
   * Delete item locally from IndexedDB
   */
  async deleteItem(id: string): Promise<void> {
    await this.dbService.db.catalogs.delete(id);
    this.items.update((list) => list.filter((i) => i.id !== id));
  }

  // Filter modifiers
  setSubject(subject: string): void {
    this.selectedSubject.set(subject);
  }

  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  setShowActiveOnly(show: boolean): void {
    this.showActiveOnly.set(show);
  }

  private updateLocalItemInState(item: CatalogItem): void {
    this.items.update((list) => {
      const index = list.findIndex((i) => i.id === item.id);
      if (index >= 0) {
        const copy = [...list];
        copy[index] = item;
        return copy;
      }
      return [item, ...list];
    });
  }

  private async seedInitialData(): Promise<void> {
    const samples: CatalogItem[] = [
      {
        id: 'cat-tech-01',
        subject: 'Computer Science',
        topic: 'Programming',
        name: 'Logic and programing',
        author: 'John Doe',
        active: true,
        description: 'Core concepts of programing logic, data structures, and algorithms.',
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
        row: 1,
      },
      {
        id: 'cat-phil-01',
        subject: 'Philosophy',
        topic: 'Philosophy',
        name: 'Basic Philosophy Concepts',
        author: 'Jane Smith',
        active: true,
        description: 'Classic philosophical concepts, thinkers, and schools of thought.',
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
        row: 2,
      }
    ];

    await this.dbService.db.catalogs.bulkPut(samples);
    this.items.set(samples);
  }
}
