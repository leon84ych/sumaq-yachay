import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppDbService } from '../../../core/services/storage/app-db.service';
import { CatalogApiService } from './catalog-api.service';
import { CatalogCategory, CatalogItem } from '../models/catalog-item.model';
import { CatalogPostPayload } from '../models/catalog-api.model';

@Injectable({
  providedIn: 'root',
})
export class CatalogService {
  private dbService = inject(AppDbService);
  private apiService = inject(CatalogApiService);

  // State Signals
  readonly items = signal<CatalogItem[]>([]);
  readonly selectedCategory = signal<CatalogCategory | 'ALL'>('ALL');
  readonly searchQuery = signal<string>('');
  readonly showActiveOnly = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly lastSyncedAt = signal<string | null>(null);

  // Computed Derived State
  readonly filteredItems = computed(() => {
    const list = this.items();
    const category = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();
    const activeOnly = this.showActiveOnly();

    return list.filter((item) => {
      const matchesCategory = category === 'ALL' || item.category === category;
      const matchesActive = !activeOnly || item.active;
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query));

      return matchesCategory && matchesActive && matchesQuery;
    });
  });

  readonly stats = computed(() => {
    const all = this.items();
    return {
      total: all.length,
      technical: all.filter((i) => i.category === 'Technical').length,
      philosophy: all.filter((i) => i.category === 'Philosophy').length,
      fiction: all.filter((i) => i.category === 'Fiction').length,
      active: all.filter((i) => i.active).length,
      pendingSync: all.filter((i) => i.syncStatus === 'pending' || i.syncStatus === 'error').length,
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
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const response = await firstValueFrom(this.apiService.getCatalog());
      if (response && response.status === 'success' && Array.isArray(response.data)) {
        const normalized: CatalogItem[] = response.data.map((item) => ({
          ...item,
          syncStatus: 'synced',
        }));

        // Atomic update in IndexedDB
        await this.dbService.db.transaction('rw', this.dbService.db.catalogs, async () => {
          await this.dbService.db.catalogs.clear();
          await this.dbService.db.catalogs.bulkPut(normalized);
        });

        this.items.set(normalized);
        this.lastSyncedAt.set(new Date().toLocaleTimeString());
      } else {
        throw new Error(response.message || 'Malformed catalog response received');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error during remote sync';
      this.errorMessage.set(errorMsg);
      console.warn('Sync from remote failed; maintaining local cache:', errorMsg);
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
      sheetName: 'MasterIndex',
      id: item.id,
      rowValues: [
        item.id,
        item.sheetId,
        item.name,
        item.category,
        item.type,
        item.active,
        now,
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
  setCategory(category: CatalogCategory | 'ALL'): void {
    this.selectedCategory.set(category);
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
        sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        name: 'Distributed Systems & Kafka',
        category: 'Technical',
        type: 'entities',
        active: true,
        description: 'Core concepts, brokers, partitions, consumer groups, and failover topologies.',
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
      },
      {
        id: 'cat-phil-01',
        sheetId: '1cDEfGhIjKlMnOpQrStUvWxYz0123456789ABCDEFGH',
        name: 'Nietzschean Philosophy & Dialectics',
        category: 'Philosophy',
        type: 'excerpts',
        active: true,
        description: 'Aphorisms, will to power, eternal recurrence, and contextual excerpts.',
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
      },
      {
        id: 'cat-fict-01',
        sheetId: '1zXYwVuTsRqPoNmLkJiHgFeDcBa9876543210ZYXWVU',
        name: 'The House of the Spirits (Allende)',
        category: 'Fiction',
        type: 'timelines',
        active: true,
        description: 'Character lineage, magical realism motifs, and historical plot chronology.',
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
      },
    ];

    await this.dbService.db.catalogs.bulkPut(samples);
    this.items.set(samples);
  }
}
