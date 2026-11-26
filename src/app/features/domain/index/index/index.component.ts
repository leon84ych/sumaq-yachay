import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { GlobalMessageService } from '../../../../core/services/global-message.service';

import { PermissionService } from '../../../../core/services/permission/permission.service';
import { IndexEntryCardComponent } from '../components/index-entry-card/index-entry-card.component';
import { StudySearchService } from '../../../../core/services/search/study-search.service';

interface IndexHierarchyGroup {
  chapter: string;
  themes: Array<{
    theme: string;
    rows: IndexRecord[];
  }>;
}

import { IndexEntryFormComponent } from '../components/index-entry-form/index-entry-form.component';
import { IndexRecord } from '../model/index-model';
import { IndexDataService } from '../services/index.service';
import { matchesStudySearch } from '../../../../shared/utils/study-search';
import { DomainWriteSyncService } from '../../shared/domain-repository/domain-write-sync.service';


@Component({
  selector: 'app-domain-index-1',
  standalone: true,
  imports: [
    IndexEntryFormComponent,
    CommonModule,
    FormsModule,
    TranslocoPipe,
    IndexEntryCardComponent,
  ],
  templateUrl: './index.component.html',
  styleUrls: ['./index.component.css'],
})
export class IndexComponent implements OnInit {

  /**
   * Domain components must only receive the BookId, Row and the count of elements 
   * and each domain is responsible for managing its own entries.
   */


  readonly bookId = input.required<string>();

  // Input and output signals for managing Index Form
  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();

  //Store the elements to be shown in this domain
  readonly rows = signal<IndexRecord[]>([]);
  readonly bookName = signal<string>('');
  readonly bookAuthor = signal<string>('');

  readonly newChapter = signal<string>('');
  readonly newTheme = signal<string>('');
  readonly newSubtheme = signal<string>('');
  readonly newTags = signal<string[]>([]);
  readonly editingId = signal<string | null>(null);
  private readonly editingOriginal = signal<IndexRecord | null>(null);
  readonly submitted = signal(false);
  readonly isSavingLocal = signal(false);
  readonly retryableIds = signal<ReadonlySet<string>>(new Set());
  readonly pendingDeletionIds = signal<ReadonlySet<string>>(new Set());
  readonly searchTerm = inject(StudySearchService).query;

  private readonly indexDataService = inject(IndexDataService);
  private readonly writeSync = inject(DomainWriteSyncService);
  private readonly destroyRef = inject(DestroyRef);
  
  private readonly globalMessageService = inject(GlobalMessageService);

  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;
  private readonly transloco = inject(TranslocoService);


  readonly filteredRows = computed(() => {
    const query = this.searchTerm();

    return this.rows().filter((row) =>
      matchesStudySearch(
        query,
        [this.bookName(), this.bookAuthor(), 'index', 'índice', row.chapter, row.theme, row.subtheme, row.contributor, ...row.tags],
        row.tags,
        { book: this.bookName(), author: this.bookAuthor(), contributor: row.contributor },
      ),
    );
  });



  async ngOnInit(): Promise<void> {
    // Initialization logic if needed
    //1. Retrieve the book info from service 
    if (this.bookId() != null) {
      const bookRecord = await this.indexDataService.getBookRecord(this.bookId());
      this.bookName.set(bookRecord?.name ?? '');
      this.bookAuthor.set(bookRecord?.author ?? '');
      // 2. Retrieve the index records for the specified book, row, and count
      const bookId = this.bookId();
      const recordsSubscription = this.indexDataService.watchRecords(bookId, (records) => {
        if (this.bookId() === bookId) this.rows.set(records);
      });
      const writesSubscription = this.writeSync.watchIndexWrites(bookId, (writes) => {
        this.retryableIds.set(new Set(writes.filter(write => write.state !== 'sending').map(write => write.id)));
        this.pendingDeletionIds.set(new Set(writes.filter(write => write.operation === 'delete' || write.deleteAfterCreate).map(write => write.id)));
      });
      this.destroyRef.onDestroy(() => {
        recordsSubscription.unsubscribe();
        writesSubscription.unsubscribe();
      });
      this.rows.set(await this.indexDataService.getRecords(bookId, (records) => {
        if (this.bookId() === bookId) this.rows.set(records);
      }));
    }

  }

  /**
   * 1. MASTER DOMAIN VALIDATION CAP
   * Evaluates core model prerequisites. Since INDEX creates definitions,
   * it is never marked invalid based on Taxonomy constraints.
   */
  readonly isFormInvalid = computed<boolean>(() => {
    return !this.newChapter().trim() || !this.newTheme().trim() || this.newTags().length === 0;
  });


  readonly hierarchy = computed<IndexHierarchyGroup[]>(() => {

    const groups = new Map<string, IndexHierarchyGroup>();

    for (const row of this.filteredRows()) {
      let chapterGroup = groups.get(row.chapter);
      if (!chapterGroup) {
        chapterGroup = { chapter: row.chapter, themes: [] };
        groups.set(row.chapter, chapterGroup);
      }

      let themeGroup = chapterGroup.themes.find((theme) => theme.theme === row.theme);
      if (!themeGroup) {
        themeGroup = { theme: row.theme, rows: [] };
        chapterGroup.themes.push(themeGroup);
      }

      themeGroup.rows.push(row);
    }

    return [...groups.values()];
  });

  async deleteEntry(id: string): Promise<void> {
    if (!window.confirm(this.transloco.translate('COMMON.CONFIRM_DELETE'))) {
      return;
    }

    const row = this.rows().find((item) => item.id === id);
    if (!row) {
      return;
    }

    try {
      const result = await this.writeSync.deleteIndex(row);
      if (result === 'pending') {
        this.pendingDeletionIds.update(ids => new Set([...ids, id]));
      }
      this.rows.update((rows) => result === 'deleted'
        ? rows.filter((item) => item.id !== id)
        : rows.map((item) => item.id === id ? { ...item, syncStatus: 'pending' } : item));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete index entry.';
      this.globalMessageService.showError(message);
    }
  }

  editEntry(row: IndexRecord): void {
    if (this.pendingDeletionIds().has(row.id)) return;
    this.submitted.set(false);
    this.editingId.set(row.id);
    this.editingOriginal.set(row);
    this.newChapter.set(row.chapter);
    this.newTheme.set(row.theme);
    this.newSubtheme.set(row.subtheme);
    this.newTags.set(row.tags);
  }

  resetForm(): void {
    this.submitted.set(false);
    this.editingId.set(null);
    this.editingOriginal.set(null);
    this.newChapter.set('');
    this.newTheme.set('');
    this.newSubtheme.set('');
    this.newTags.set([]);
    this.closeEntry.emit();
  }

  async addIndexEntry(): Promise<void> {
    if (this.isSavingLocal()) return;
    this.submitted.set(true);
    if (this.isFormInvalid()) {
      return;
    }

    const editingId = this.editingId();
    const chapter = this.newChapter().trim();
    const theme = this.newTheme().trim();
    const subtheme = this.newSubtheme().trim();
    const tags = [...this.newTags()];
    this.isSavingLocal.set(true);
    try {
      const book = await this.indexDataService.getBookRecord(this.bookId());
      if (!book?.row) throw new Error('Book record is missing row.');
      const resolvedId = editingId ? this.writeSync.resolveIndexId(this.bookId(), editingId) : null;
      const original = resolvedId
        ? this.rows().find(row => row.id === resolvedId) ?? this.editingOriginal() ?? undefined
        : undefined;
      if (editingId && !original) throw new Error('The Index entry being edited is no longer available.');
      const indexEntry: IndexRecord = {
        id: resolvedId ?? `idx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        bookRow: book.row,
        feed: original?.feed ?? 0,
        bookId: this.bookId(),
        contributor: original?.contributor ?? '',
        itemRow: original?.itemRow ?? 0,
        chapter, theme, subtheme, tags,
        syncStatus: 'pending',
      };
      const savedEntry = await this.indexDataService.saveLocally(indexEntry, !!editingId);
      this.rows.update((rows) => {
        const existingIndex = rows.findIndex((row) => row.id === indexEntry.id || row.id === savedEntry.id);
        if (existingIndex === -1) {
          return [...rows, savedEntry];
        }

        return rows.flatMap((row, index) =>
          row.id === indexEntry.id || row.id === savedEntry.id
            ? index === existingIndex ? [savedEntry] : []
            : [row],
        );
      });
      this.resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add index entry.';
      this.globalMessageService.showError(message);
    } finally {
      this.isSavingLocal.set(false);
    }
  }

  async retryEntry(record: IndexRecord): Promise<void> {
    try {
      const write = await this.writeSync.getIndexWrite(record);
      if (!write) return;
      const account = this.writeSync.getActiveAccount();
      if (!account || (write.ownerEmail && write.ownerEmail !== account.toLowerCase())) {
        await this.writeSync.retryIndex(record);
        return;
      }
      let confirmedAccount = false;
      if (!write.ownerEmail) {
        if (!window.confirm(this.transloco.translate('DOMAINS.INDEX.CONFIRM_SYNC_ACCOUNT', { account }))) return;
        confirmedAccount = true;
      }
      let confirmedUncertain = false;
      if (write?.state === 'uncertain' && write.operation === 'create' &&
          !window.confirm(this.transloco.translate('DOMAINS.INDEX.CONFIRM_UNCERTAIN_RETRY'))) return;
      if (write?.state === 'uncertain' && write.operation === 'delete') {
        if (window.confirm(this.transloco.translate('DOMAINS.INDEX.CONFIRM_DELETE_ALREADY_DONE'))) {
          if (await this.writeSync.confirmIndexDeletion(record, confirmedAccount)) {
            this.rows.update(rows => rows.filter(row => row.id !== record.id));
          }
          return;
        }
        if (!window.confirm(this.transloco.translate('DOMAINS.INDEX.CONFIRM_UNCERTAIN_DELETE_RETRY'))) return;
      }
      confirmedUncertain = write?.state === 'uncertain' && (write.operation === 'create' || write.operation === 'delete');
      await this.writeSync.retryIndex(record, confirmedAccount, confirmedUncertain);
    } catch (error) {
      this.globalMessageService.showError(error instanceof Error ? error.message : 'Failed to retry synchronization.');
    }
  }
}
