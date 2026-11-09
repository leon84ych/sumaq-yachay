import { effect, Injectable, computed, inject, signal } from '@angular/core';
import { CatalogRecord } from '../models/catalog-item.model';
import { AppDbService } from '../../../../core/services/storage/app-db.service';
import { GoogleAuthService } from '../../../authentication/services/google-auth-service';
import { ConfigService } from '../../../../core/services/config/config.service';
import { GlobalLoadingService } from '../../../../core/services/loading/global-loading.service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { StudySearchService } from '../../../../core/services/search/study-search.service';
import { matchesStudySearch, parseStudySearch } from '../../../../shared/utils/study-search';
import { CatalogGASRepository } from '../../../../core/infrastructure/gas/catalog-gas-repository';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { Status } from '../../shared/model/domain-shared-model';


const CONTENT_SEARCH_TERMS: Record<string, string[]> = {
  indexTopics: ['index', 'índice'],
};

@Injectable({
  providedIn: 'root',
})
export class CatalogService {

  private authService = inject(GoogleAuthService);
  private configService = inject(ConfigService);
  private globalLoadingService = inject(GlobalLoadingService);
  private permissionService = inject(PermissionService);


  private catalogGASRepository = inject(CatalogGASRepository);
  private localDBService = inject(LocalDBService);

  // State Signals
  readonly items = signal<CatalogRecord[]>([]);
  readonly selectedSubject = signal<string>('ALL');
  readonly searchQuery = inject(StudySearchService).query;
  readonly showActiveOnly = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly lastSyncedAt = signal<string | null>(null);
  private readonly relatedMatches = signal({ query: '', rows: new Set<number>() });

  // Computed Derived State
  readonly filteredItems = computed(() => {
    const list = this.items();
    const subject = this.selectedSubject();
    const query = this.searchQuery().toLowerCase().trim();
    const activeOnly = this.showActiveOnly();
    const related = this.relatedMatches();

    return list.filter((item) => {
      const matchesSubject = subject === 'ALL' || item.subject === subject;
      const matchesActive = !activeOnly || item.active;
      const matchesQuery =
        !query ||
        (related.query === query && related.rows.has(item.row)) ||
        matchesStudySearch(query,
          [item.name, item.subject, item.topic, item.author, item.description ?? '', item.source ?? ''],
          [], { book: item.name, author: item.author },
        );

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
    effect((onCleanup) => {
      const query = this.searchQuery().toLowerCase().trim();
      const items = this.items();
      if (!query || items.length === 0) return;

      let active = true;
      const timer = setTimeout(() => {
        void this.loadRelatedMatches(query).then(
          (rows) => { if (active) this.relatedMatches.set({ query, rows }); },
          () => { if (active) this.relatedMatches.set({ query, rows: new Set<number>() }); },
        );
      }, 250);
      onCleanup(() => {
        active = false;
        clearTimeout(timer);
      });
    });

    effect(() => {
      const localSampleDataEnabled = this.configService.localSampleDataEnabled();
      if (localSampleDataEnabled) {
        this.permissionService.setRole('admin');
        void this.loadLocalSampleData();
        return;
      }
      void this.loadFromLocal();
    });

    if (!this.configService.isLocalSampleDataEnabled()) {
      void this.init();
    }
  }

  private async loadRelatedMatches(query: string): Promise<Set<number>> {
    const matches = new Set<number>();
    const search = parseStudySearch(query);
    const catalogByRow = new Map(this.items().map((item) => [item.row, item]));
    const tables = (this.localDBService.indexedDB.tables ?? [])
      .filter((table) => Object.hasOwn(CONTENT_SEARCH_TERMS, table.name));
    await Promise.all(tables.map(async (table) => {
      const rows = await table.toArray() as Record<string, unknown>[];
      for (const row of rows) {
        const bookRow = Number(row['row']);
        const catalog = catalogByRow.get(bookRow);
        const fields = Object.values(row).flatMap((value) =>
          typeof value === 'string' ? [value] : Array.isArray(value)
            ? value.filter((entry): entry is string => typeof entry === 'string') : [],
        );
        const tags = table.name === 'bookTags' ? [row['name']] : row['tags'];
        if (matchesStudySearch(search, [
          ...fields, ...CONTENT_SEARCH_TERMS[table.name],
          catalog?.name, catalog?.author, catalog?.subject, catalog?.topic,
        ], tags, { book: catalog?.name, author: catalog?.author, contributor: row['contributor'] })) {
          if (Number.isFinite(bookRow)) matches.add(bookRow);
        }
      }
    }));
    return matches;
  }

  async init(): Promise<void> {
    if (this.configService.isLocalSampleDataEnabled()) {
      await this.loadLocalSampleData();
    } else {
      await this.loadFromLocal();
    }
  }

  private async loadLocalSampleData(): Promise<void> {
    this.isLoading.set(true);
    try {
      // Seed local sample data
      //await this.localDBService.seedLocalSampleData();
      await this.loadFromLocal();
    } catch (err) {
      this.errorMessage.set('CATALOG.ERRORS.syncFailed');
      console.error('Failed to load LocalSampleData:', err);
    } finally {
      this.isLoading.set(false);
    }
  }


  /**
   * Load stored items from IndexedDB
   */
  async loadFromLocal(): Promise<void> {
    this.isLoading.set(true);
    try {
      const localItems = await this.localDBService.indexedDB.catalogs.toArray();
      this.items.set(localItems);
    } catch (err) {
      console.error('Failed to load catalogs from IndexedDB:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * HTTP GET: Syncs the catalog from Google Apps Script Web App
   */
  async syncFromRemote(): Promise<void> {
    if (this.configService.isLocalSampleDataEnabled()) {
      return;
    }

    if (!this.authService.idToken()) {
      this.errorMessage.set('CATALOG.ERRORS.authRequired');
      console.warn('Sync aborted: User is not authenticated with Google.');
      return;
    }

    const operation = this.globalLoadingService.begin();
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const pageSize = 2;
      let page = 1;
      let totalPages = 1;
      //clear local data
      await this.localDBService.indexedDB.catalogs.clear();
      this.items.set([]);

      while (page <= totalPages) {
        const response = await this.catalogGASRepository.getCatalogs(page, pageSize);
        const message = typeof response.message === 'string' ? response.message : '';
        if (
          response.status === Status.ERROR &&
          message.includes('Invalid or expired Google token')
        ) {
          console.warn('Google token expired; logging the user out.');
          this.authService.logout();
        }

        if (response.status !== 'success' || !Array.isArray(response.data.rows)) {
          throw new Error(message || 'CATALOG.ERRORS.malformedCatalog');
        }
        //progressively update the items signal with each page of data
        this.items.update(items => [...items, ...response.data.rows]);
        //remove loading after first page successfuly retrieved
        this.globalLoadingService.end(operation);
        this.isLoading.set(false);
        totalPages = response.data.totalPages;
        page++;
      }

      this.lastSyncedAt.set(new Date().toLocaleTimeString());

      //save all items in IndexedDB
      await this.localDBService.indexedDB.transaction('rw', this.localDBService.indexedDB.catalogs, async () => {
        await this.localDBService.indexedDB.catalogs.clear();
        await this.localDBService.indexedDB.catalogs.bulkPut(this.items());
      });


    } catch (err: unknown) {
      this.errorMessage.set('CATALOG.ERRORS.syncFailed');
      console.warn('Sync from remote failed; maintaining local cache:', err);
    } finally {
      this.globalLoadingService.end(operation);
      this.isLoading.set(false);
    }
  }



  /**
 * HTTP POST: Optimistically save or update an item locally and push to Google Sheets
 */
  async saveItem(
    itemInput: Omit<CatalogRecord, 'updatedAt' | 'syncStatus'>,
    isEdit: boolean,
    originalId?: string // Pass original ID to handle primary key renames during edits
  ): Promise<void> {
    const localSampleDataEnabled = this.configService.isLocalSampleDataEnabled();
    const localRow = localSampleDataEnabled && !itemInput.row
      ? Math.max(0, ...this.items().map((existing) => existing.row)) + 1
      : itemInput.row;
    const now = new Date().toISOString();
    const item: CatalogRecord = {
      ...itemInput,
      row: localRow,
      updatedAt: now,
      syncStatus: localSampleDataEnabled ? 'synced' : 'pending',
    };

    // Handle key mutation in IndexedDB if the ID changed during an edit
    if (isEdit && originalId && originalId !== item.id) {
      // await this.dbService.db.catalogs.delete(originalId);
      this.removeLocalItemInState(originalId); // Helper to clear state array
    }

    const operation = this.globalLoadingService.begin();

    // 1. Optimistic local update
    // await this.dbService.db.catalogs.put(item);
    this.updateLocalItemInState(item);

    if (localSampleDataEnabled) {
      this.globalLoadingService.end(operation);
      return;
    }
    throw new Error("Method not implemented.");
    // // 2. Prepare POST payload for Apps Script
    // const payload: CatalogPostPayload = {
    //   action: isEdit ? 'UPDATE_CATALOG_ITEM' : 'CREATE_CATALOG_ITEM',
    //   id: item.id,
    //   row: item.row,
    //   rowValues: mapCatalogRecordToRowValues(item),
    // };

    // // 3. Send over HTTP POST to GAS
    // try {
    //   const res = await firstValueFrom(this.apiService.saveCatalogRecord(payload));

    //   if (res && res.status === 'success') {
    //     const serverData = res.data || {};

    //     const syncedItem: CatalogRecord = {
    //       ...item,
    //       row: serverData.row || item.row,
    //       updatedAt: serverData.updatedAt || item.updatedAt,
    //       syncStatus: serverData.syncStatus || 'synced',
    //     };

    //     await this.dbService.db.catalogs.put(syncedItem);
    //     this.updateLocalItemInState(syncedItem);
    //   } else {
    //     throw new Error(res?.message || 'Remote save failed');
    //   }
    // } catch (err: unknown) {
    //   console.error('Remote POST save failed, marked as error:', err);
    //   const errorItem: CatalogRecord = { ...item, syncStatus: 'error' };
    //   await this.dbService.db.catalogs.put(errorItem);
    //   this.updateLocalItemInState(errorItem);
    // } finally {
    //   this.globalLoadingService.end(operation);
    // }
  }

  async cloneCatalogRecordFromSheet(sheetUrl: string): Promise<boolean> {
    if (this.configService.isLocalSampleDataEnabled()) {
      this.errorMessage.set('CATALOG.ERRORS.cloneItemUnavailable');
      return false;
    }
    if (!this.authService.idToken()) {
      this.errorMessage.set('CATALOG.ERRORS.authRequired');
      return false;
    }
    if (this.isLoading()) return false;
    throw new Error("Method not implemented.");
    // const operation = this.globalLoadingService.begin();
    // this.isLoading.set(true);
    // this.errorMessage.set(null);
    // try {
    //   const payload: CloneCatalogRecordPayload = { action: 'CLONE_CATALOG_ITEM', SheetId: sheetUrl };
    //   const response = await firstValueFrom(this.apiService.cloneCatalogRecord(payload));
    //   if (response?.status !== 'success') {
    //     throw new Error(response?.message || 'CATALOG.ERRORS.cloneItemFailed');
    //   }
    //   await this.syncFromRemote();
    //   if (this.errorMessage()) {
    //     this.errorMessage.set('CATALOG.ERRORS.cloneItemRefreshFailed');
    //     return false;
    //   }
    //   return true;
    // } catch (error: unknown) {
    //   this.errorMessage.set(error instanceof Error && error.message
    //     ? error.message : 'CATALOG.ERRORS.cloneItemFailed');
    //   return false;
    // } finally {
    //   this.isLoading.set(false);
    //   this.globalLoadingService.end(operation);
    // }
  }

  async addCatalogFromSheet(sheetUrl: string): Promise<boolean> {
    if (this.configService.isLocalSampleDataEnabled() || this.items().length > 0) {
      this.errorMessage.set('CATALOG.ERRORS.copyCatalogUnavailable');
      return false;
    }
    throw new Error("Method not implemented.");
    // if (!this.authService.idToken()) {
    //   this.errorMessage.set('CATALOG.ERRORS.authRequired');
    //   return false;
    // }

    // const operation = this.globalLoadingService.begin();
    // this.isLoading.set(true);
    // this.errorMessage.set(null);

    // try {
    //   const payload: CopyCatalogPayload = {
    //     action: 'CLONE_CATALOG',
    //     SheetId: sheetUrl,
    //   };
    //   const response = await firstValueFrom(this.apiService.copyCatalog(payload));
    //   if (response?.status !== 'success') {
    //     throw new Error(response?.message || 'Catalog copy failed');
    //   }

    //   await this.syncFromRemote();
    //   return true;
    // } catch (error: unknown) {
    //   console.error('Google Sheet catalog request failed:', error);
    //   this.errorMessage.set(
    //     error instanceof Error && error.message
    //       ? error.message
    //       : 'CATALOG.ERRORS.copyCatalogFailed',
    //   );
    //   return false;
    // } finally {
    //   this.isLoading.set(false);
    //   this.globalLoadingService.end(operation);
    // }
  }

  /**
   * Toggle the active status of a catalog item
   */
  async toggleActive(item: CatalogRecord): Promise<void> {
    const updated: CatalogRecord = {
      ...item,
      active: !item.active,
    };
    await this.saveItem(updated, true);
  }

  /**
   * Delete item locally from IndexedDB
   */
  async deleteItem(id: string): Promise<void> {
    //await this.dbService.db.catalogs.delete(id);
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

  private updateLocalItemInState(item: CatalogRecord): void {
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

  /**
 * Removes an item from the local reactive state array by its ID
 */
  private removeLocalItemInState(idToRemove: string): void {
    this.items.update(currentItems => currentItems.filter(item => item.id !== idToRemove));
  }
}
