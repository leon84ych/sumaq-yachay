import { Injectable, inject, signal, computed } from '@angular/core';
import { LocalDBService } from '../../../shared/local-db/local-db.service';
import { parseTagsFromArray } from '../../../shared/tag-picker/tag-picker.mapper';

@Injectable({
  providedIn: 'root',
})
export class TaxonomyService {
  private readonly dbService = inject(LocalDBService);

  // 1. Reactive memory state for valid system tags
  readonly verifiedTags = signal<Set<string>>(new Set());

  /**
   * Scans the INDEX domain local cache to build the master list of authorized hashtags.
   * This must be run whenever the book changes or when the INDEX domain completes a sync.
   */
  async refreshGlobalTaxonomy(row: number): Promise<void> {
    const database = this.dbService.indexedDB;
    const book = await database.books.where('row').equals(row).first();
    const indexRecords = book
      ? await database.indexes.where('bookId').equals(book.id).toArray()
      : [];

    const masterTags = new Set<string>();

    for (const record of indexRecords) {
      for (const segment of parseTagsFromArray(record['tags'])) {
        const cleanTag = segment.trim().replace(/^#+/, '').toLowerCase();
        if (cleanTag) {
          masterTags.add(`#${cleanTag}`);
        }
      }
    }

    // Update the reactive memory state
    this.verifiedTags.set(masterTags);
  }

  /**
   * Validation rule: Verifies if a given tag string exists inside the master INDEX pool.
   */
  isTagAllowed(tag: string): boolean {
    const normalized = tag.trim().replace(/^#+/, '').toLowerCase();
    return this.verifiedTags().has(`#${normalized}`);
  }

  /**
   * Filters an array of raw input tags, returning only those that are pre-authorized.
   */
  filterAllowedTags(rawTags: string[]): string[] {
    return rawTags
      .map(t => t.trim().toLowerCase())
      .filter(t => this.isTagAllowed(t));
  }
}
