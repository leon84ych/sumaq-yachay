import { effect, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppDbService } from '../../../core/services/storage/app-db.service';
import { ConfigService } from '../../../core/services/config.service';
import { CatalogApiService } from './catalog-api.service';
import { CatalogItem } from '../models/catalog-item.model';
import { CatalogPostPayload, CloneCatalogItemPayload, CopyCatalogPayload } from '../models/catalog-api.model';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';
import { GlobalLoadingService } from '../../../core/services/global-loading.service';
import { PermissionService } from '../../../core/services/permission.service';
import { mapCatalogItemToRowValues } from './catalog-row-values';
import { StudySearchService } from '../../../core/services/study-search.service';
import { matchesStudySearch, parseStudySearch } from '../../../shared/utils/study-search';

const CONTENT_SEARCH_TERMS: Record<string, string[]> = {
  indexTopics: ['index', 'índice'],
  concepts: ['concepts', 'conceptos'],
  quotes: ['quotes', 'citas'],
  passages: ['passages', 'pasajes'],
  characters: ['character', 'characters', 'personaje', 'personajes'],
  places: ['places', 'lugar', 'lugares'],
  bookEvents: ['book events', 'book_events', 'events', 'eventos'],
  relationsCharacters: ['relations', 'relationships', 'relaciones'],
  relationsConcepts: ['associations', 'concept relationships', 'asociaciones'],
  glosary: ['glosary', 'glossary', 'glosario'],
  questions: ['questions', 'preguntas'],
  bookTags: [],
};

@Injectable({
  providedIn: 'root',
})
export class CatalogService {
  private dbService = inject(AppDbService);
  private apiService = inject(CatalogApiService);
  private authService = inject(GoogleAuthService);
  private configService = inject(ConfigService);
  private globalLoadingService = inject(GlobalLoadingService);
  private permissionService = inject(PermissionService);

  // State Signals
  readonly items = signal<CatalogItem[]>([]);
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

      const token = this.authService.idToken();
      if (!token) return;

      void this.syncFromRemote();
    });

    if (!this.configService.isLocalSampleDataEnabled()) {
      void this.init();
    }
  }

  private async loadRelatedMatches(query: string): Promise<Set<number>> {
    const matches = new Set<number>();
    const search = parseStudySearch(query);
    const catalogByRow = new Map(this.items().map((item) => [item.row, item]));
    const tables = (this.dbService.db.tables ?? [])
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
      await this.dbService.seedLocalSampleData();
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
      const localItems = await this.dbService.db.catalogs.toArray();
      const generatedSampleIds = new Set(['cat-tech-01', 'cat-phil-01']);
      const userItems = localItems.filter((item) => !generatedSampleIds.has(item.id));

      if (userItems.length !== localItems.length) {
        await this.dbService.db.catalogs.bulkDelete(
          localItems.filter((item) => generatedSampleIds.has(item.id)).map((item) => item.id)
        );
      }

      this.items.set(userItems);
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
      const response = await firstValueFrom(this.apiService.getCatalog());
      if (response && response.status === 'success' && Array.isArray(response.data)) {
        if (response.data.length === 0) {
          await this.dbService.clearAllTables();

          this.items.set([]);
          this.lastSyncedAt.set(new Date().toLocaleTimeString());
          return;
        }

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
        const message = typeof response?.message === 'string' ? response.message : '';
        if (response?.status === 'error' && message.includes('Invalid or expired Google token')) {
          console.warn('Google token expired; logging the user out.');
          this.authService.logout();
        }

        throw new Error(message || 'CATALOG.ERRORS.malformedCatalog');
      }
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
    itemInput: Omit<CatalogItem, 'updatedAt' | 'syncStatus'>,
    isEdit: boolean,
    originalId?: string // Pass original ID to handle primary key renames during edits
  ): Promise<void> {
    const localSampleDataEnabled = this.configService.isLocalSampleDataEnabled();
    const localRow = localSampleDataEnabled && !itemInput.row
      ? Math.max(0, ...this.items().map((existing) => existing.row)) + 1
      : itemInput.row;
    const now = new Date().toISOString();
    const item: CatalogItem = {
      ...itemInput,
      row: localRow,
      updatedAt: now,
      syncStatus: localSampleDataEnabled ? 'synced' : 'pending',
    };

    // Handle key mutation in IndexedDB if the ID changed during an edit
    if (isEdit && originalId && originalId !== item.id) {
      await this.dbService.db.catalogs.delete(originalId);
      this.removeLocalItemInState(originalId); // Helper to clear state array
    }

    const operation = this.globalLoadingService.begin();

    // 1. Optimistic local update
    await this.dbService.db.catalogs.put(item);
    this.updateLocalItemInState(item);

    if (localSampleDataEnabled) {
      this.globalLoadingService.end(operation);
      return;
    }

    // 2. Prepare POST payload for Apps Script
    const payload: CatalogPostPayload = {
      action: isEdit ? 'UPDATE_CATALOG_ITEM' : 'CREATE_CATALOG_ITEM',
      id: item.id,
      row: item.row,
      rowValues: mapCatalogItemToRowValues(item),
    };

    // 3. Send over HTTP POST to GAS
    try {
      const res = await firstValueFrom(this.apiService.saveCatalogItem(payload));

      if (res && res.status === 'success') {
        const serverData = res.data || {};

        const syncedItem: CatalogItem = {
          ...item,
          row: serverData.row || item.row,
          updatedAt: serverData.updatedAt || item.updatedAt,
          syncStatus: serverData.syncStatus || 'synced',
        };

        await this.dbService.db.catalogs.put(syncedItem);
        this.updateLocalItemInState(syncedItem);
      } else {
        throw new Error(res?.message || 'Remote save failed');
      }
    } catch (err: unknown) {
      console.error('Remote POST save failed, marked as error:', err);
      const errorItem: CatalogItem = { ...item, syncStatus: 'error' };
      await this.dbService.db.catalogs.put(errorItem);
      this.updateLocalItemInState(errorItem);
    } finally {
      this.globalLoadingService.end(operation);
    }
  }

  async cloneCatalogItemFromSheet(sheetUrl: string): Promise<boolean> {
    if (this.configService.isLocalSampleDataEnabled()) {
      this.errorMessage.set('CATALOG.ERRORS.cloneItemUnavailable');
      return false;
    }
    if (!this.authService.idToken()) {
      this.errorMessage.set('CATALOG.ERRORS.authRequired');
      return false;
    }
    if (this.isLoading()) return false;

    const operation = this.globalLoadingService.begin();
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const payload: CloneCatalogItemPayload = { action: 'CLONE_CATALOG_ITEM', SheetId: sheetUrl };
      const response = await firstValueFrom(this.apiService.cloneCatalogItem(payload));
      if (response?.status !== 'success') {
        throw new Error(response?.message || 'CATALOG.ERRORS.cloneItemFailed');
      }
      await this.syncFromRemote();
      if (this.errorMessage()) {
        this.errorMessage.set('CATALOG.ERRORS.cloneItemRefreshFailed');
        return false;
      }
      return true;
    } catch (error: unknown) {
      this.errorMessage.set(error instanceof Error && error.message
        ? error.message : 'CATALOG.ERRORS.cloneItemFailed');
      return false;
    } finally {
      this.isLoading.set(false);
      this.globalLoadingService.end(operation);
    }
  }

  async addCatalogFromSheet(sheetUrl: string): Promise<boolean> {
    if (this.configService.isLocalSampleDataEnabled() || this.items().length > 0) {
      this.errorMessage.set('CATALOG.ERRORS.copyCatalogUnavailable');
      return false;
    }

    if (!this.authService.idToken()) {
      this.errorMessage.set('CATALOG.ERRORS.authRequired');
      return false;
    }

    const operation = this.globalLoadingService.begin();
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const payload: CopyCatalogPayload = {
        action: 'CLONE_CATALOG',
        SheetId: sheetUrl,
      };
      const response = await firstValueFrom(this.apiService.copyCatalog(payload));
      if (response?.status !== 'success') {
        throw new Error(response?.message || 'Catalog copy failed');
      }

      await this.syncFromRemote();
      return true;
    } catch (error: unknown) {
      console.error('Google Sheet catalog request failed:', error);
      this.errorMessage.set(
        error instanceof Error && error.message
          ? error.message
          : 'CATALOG.ERRORS.copyCatalogFailed',
      );
      return false;
    } finally {
      this.isLoading.set(false);
      this.globalLoadingService.end(operation);
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

  /**
 * Removes an item from the local reactive state array by its ID
 */
  private removeLocalItemInState(idToRemove: string): void {
    this.items.update(currentItems => currentItems.filter(item => item.id !== idToRemove));
  }
}
