import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { StudySearchService } from '../../../../core/services/search/study-search.service';
import {
  normalizeTagsFromArray,
  parseTagsFromArray,
} from '../../../../shared/tag-picker/tag-picker.mapper';
import { matchesStudySearch } from '../../../../shared/utils/study-search';
import { PassageEntryCardComponent } from '../components/passage-entry-card/passage-entry-card.component';
import { PassageFormComponent } from '../components/passage-form/passage-form.component';
import { PassageReaderComponent } from '../components/passage-reader/passage-reader.component';
import {
  PASSAGE_DEFAULT_FEED,
  PASSAGE_TEXT_MAX_LENGTH,
  PassageRecord,
} from '../model/passages-model';
import { PassageDataService } from '../services/passages.service';
import { PassageWriteSyncService } from '../../shared/domain-repository/domain-write-sync.service';
import { createDomainId } from '../../shared/model/domain-shared-model';

@Component({
  selector: 'app-domain-passages',
  imports: [
    FormsModule,
    TranslocoPipe,
    PassageFormComponent,
    PassageEntryCardComponent,
    PassageReaderComponent,
  ],
  templateUrl: './passages.component.html',
  styleUrls: ['./passages.component.css'],
})
export class PassagesComponent implements OnInit {
  /** Domain components only receive the book ID and manage their own entries. */
  readonly bookId = input.required<string>();
  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();

  // Unfiltered local source of truth for this book.
  readonly rows = signal<PassageRecord[]>([]);
  readonly bookName = signal('');
  readonly bookAuthor = signal('');
  readonly bookRow = signal<number | null>(null);
  private readonly allowedTags = signal<ReadonlySet<string>>(new Set());

  readonly selectedPassage = signal<PassageRecord | null>(null);
  readonly newTitle = signal('');
  readonly newPassageText = signal('');
  readonly newBook = signal('');
  readonly newAuthor = signal('');
  readonly newPage = signal('');
  readonly newTags = signal<string[]>([]);
  readonly editingId = signal<string | null>(null);
  private readonly editingOriginal = signal<PassageRecord | null>(null);
  readonly submitted = signal(false);
  readonly isSaving = signal(false);
  readonly retryableIds = signal<ReadonlySet<string>>(new Set());
  readonly pendingDeletionIds = signal<ReadonlySet<string>>(new Set());
  readonly searchTerm = inject(StudySearchService).query;
  readonly passageTextMaxLength = PASSAGE_TEXT_MAX_LENGTH;
  readonly passageTextCharactersRemaining = computed(
    () => this.passageTextMaxLength - this.newPassageText().length,
  );

  private readonly passageDataService = inject(PassageDataService);
  private readonly globalMessageService = inject(GlobalMessageService);
  private readonly writeSync = inject(PassageWriteSyncService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly transloco = inject(TranslocoService);
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;

  /** Tags typed in the form that are not part of the book's INDEX taxonomy. */
  readonly invalidTagsDetected = computed<string[]>(() => {
    const allowed = this.allowedTags();
    return parseTagsFromArray(this.newTags()).filter(
      (tag) => !allowed.has(normalizeTagsFromArray([tag])[0]),
    );
  });

  readonly isFormInvalid = computed<boolean>(
    () =>
      !this.newTitle().trim() ||
      !this.newPassageText().trim() ||
      !this.newBook().trim() ||
      !this.newAuthor().trim() ||
      this.invalidTagsDetected().length > 0,
  );

  readonly filteredRows = computed(() => {
    const query = this.searchTerm().trim();
    const bookName = this.bookName();
    const bookAuthor = this.bookAuthor();

    return this.rows().filter(
      (row) =>
        !query ||
        matchesStudySearch(
          query,
          [
            bookName,
            bookAuthor,
            'passages',
            'pasajes',
            row.title,
            row.passageText,
            row.book,
            row.author,
            row.page,
            row.contributor,
            ...row.tags,
          ],
          row.tags,
          {
            book: bookName || row.book,
            author: bookAuthor || row.author,
            contributor: row.contributor,
          },
        ),
    );
  });

  constructor() {
    // Opening the form must see the latest INDEX tags.
    effect(() => {
      if (this.isAddingEntry()) {
        untracked(() => void this.refreshAllowedTags());
      }
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const book = await this.passageDataService.getBookRecord(this.bookId());
      this.bookName.set(book?.name ?? '');
      this.bookAuthor.set(book?.author ?? '');
      this.bookRow.set(book?.row ?? null);
      this.newBook.set(this.bookName());
      this.newAuthor.set(this.bookAuthor());

      await this.refreshAllowedTags();
      const bookId = this.bookId();
      const recordsSubscription = this.passageDataService.watchRecords(bookId, (records) => {
        if (this.bookId() === bookId) this.rows.set(records);
      });
      const writesSubscription = this.writeSync.watchWrites(bookId, (writes) => {
        this.retryableIds.set(new Set(writes.filter((write) => write.state !== 'sending').map((write) => write.id)));
        this.pendingDeletionIds.set(new Set(writes.filter((write) => write.operation === 'delete' || write.deleteAfterCreate).map((write) => write.id)));
      });
      this.destroyRef.onDestroy(() => {
        recordsSubscription.unsubscribe();
        writesSubscription.unsubscribe();
      });
      this.rows.set(await this.passageDataService.getRecords(bookId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load passages.';
      this.globalMessageService.showError(message);
    }
  }

  async refreshAllowedTags(): Promise<void> {
    try {
      const tags = await this.passageDataService.getAllowedTags(this.bookId());
      this.allowedTags.set(new Set(normalizeTagsFromArray(tags)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load book tags.';
      this.globalMessageService.showError(message);
    }
  }

  openReader(row: PassageRecord): void {
    this.selectedPassage.set(row);
  }

  closeReader(): void {
    this.selectedPassage.set(null);
  }

  async deleteEntry(id: string): Promise<void> {
    if (!window.confirm(this.transloco.translate('COMMON.CONFIRM_DELETE'))) {
      return;
    }

    const row = this.rows().find((item) => item.id === id);
    if (!row) {
      return;
    }

    try {
      const result = await this.writeSync.delete(row);
      if (result === 'pending') {
        this.pendingDeletionIds.update((ids) => new Set([...ids, id]));
      }
      this.rows.update((rows) => result === 'deleted'
        ? rows.filter((item) => item.id !== id)
        : rows.map((item) => item.id === id ? { ...item, syncStatus: 'pending' } : item));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete passage.';
      this.globalMessageService.showError(message);
    }
  }

  editEntry(row: PassageRecord): void {
    if (this.pendingDeletionIds().has(row.id)) return;
    this.submitted.set(false);
    this.editingId.set(row.id);
    this.editingOriginal.set(row);
    this.newTitle.set(row.title);
    this.newPassageText.set(row.passageText);
    this.newBook.set(row.book);
    this.newAuthor.set(row.author);
    this.newPage.set(row.page);
    this.newTags.set(row.tags);
    void this.refreshAllowedTags();
  }

  resetForm(): void {
    this.submitted.set(false);
    this.editingId.set(null);
    this.editingOriginal.set(null);
    this.newTitle.set('');
    this.newPassageText.set('');
    this.newBook.set(this.bookName());
    this.newAuthor.set(this.bookAuthor());
    this.newPage.set('');
    this.newTags.set([]);
    this.closeEntry.emit();
  }

  async savePassage(): Promise<void> {
    if (this.isSaving()) {
      return;
    }
    this.submitted.set(true);
    if (this.isFormInvalid()) {
      return;
    }

    const editingId = this.editingId();
    const resolvedId = editingId ? this.writeSync.resolveId(this.bookId(), editingId) : null;
    const original = editingId
      ? this.rows().find((row) => row.id === resolvedId || row.id === editingId) ?? this.editingOriginal() ?? undefined
      : undefined;
    if (editingId && !original) {
      this.globalMessageService.showError('The passage being edited is no longer available.');
      return;
    }

    const bookRow = this.bookRow() ?? original?.bookRow;
    if (!bookRow) {
      this.globalMessageService.showError('Book record is missing row.');
      return;
    }

    const record: PassageRecord = {
      ...original,
      id: resolvedId ?? createDomainId(this.bookId(), 'PASSAGES'),
      bookId: this.bookId(),
      bookRow,
      itemRow: original?.itemRow ?? 0,
      title: this.newTitle().trim(),
      passageText: this.newPassageText().trim().slice(0, this.passageTextMaxLength),
      book: this.newBook().trim(),
      author: this.newAuthor().trim(),
      page: this.newPage().trim(),
      tags: normalizeTagsFromArray(this.newTags()),
      feed: original?.feed ?? PASSAGE_DEFAULT_FEED,
      contributor: original?.contributor ?? '',
      syncStatus: 'pending',
    };

    this.isSaving.set(true);
    try {
      const saved = await this.passageDataService.saveLocally(record, !!editingId);
      this.rows.update((rows) => {
        const matchesSaved = (row: PassageRecord) =>
          row.id === editingId || row.id === record.id || row.id === saved.id;
        const existingIndex = rows.findIndex(matchesSaved);
        if (existingIndex === -1) {
          return [...rows, saved];
        }
        return rows.flatMap((row, index) =>
          index === existingIndex ? [saved] : matchesSaved(row) ? [] : [row],
        );
      });
      // A reader opened on the edited passage must show the saved text.
      if (this.selectedPassage()?.id === record.id || this.selectedPassage()?.id === editingId) {
        this.selectedPassage.set(saved);
      }
      this.resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save passage.';
      this.globalMessageService.showError(message);
    } finally {
      this.isSaving.set(false);
    }
  }

  async retryEntry(record: PassageRecord): Promise<void> {
    try {
      const write = await this.writeSync.getWrite(record);
      if (!write) return;
      const account = this.writeSync.getActiveAccount();
      if (!account || (write.ownerEmail && write.ownerEmail !== account.toLowerCase())) {
        await this.writeSync.retry(record);
        return;
      }
      let confirmedAccount = false;
      if (!write.ownerEmail) {
        if (!window.confirm(this.transloco.translate('DOMAINS.INDEX.CONFIRM_SYNC_ACCOUNT', { account }))) return;
        confirmedAccount = true;
      }
      if (write.state === 'uncertain' && write.operation === 'create' &&
          !window.confirm(this.transloco.translate('DOMAINS.INDEX.CONFIRM_UNCERTAIN_RETRY'))) return;
      if (write.state === 'uncertain' && write.operation === 'delete') {
        if (window.confirm(this.transloco.translate('DOMAINS.INDEX.CONFIRM_DELETE_ALREADY_DONE'))) {
          if (await this.writeSync.confirmDeletion(record, confirmedAccount)) {
            this.rows.update((rows) => rows.filter((row) => row.id !== record.id));
          }
          return;
        }
        if (!window.confirm(this.transloco.translate('DOMAINS.INDEX.CONFIRM_UNCERTAIN_DELETE_RETRY'))) return;
      }
      await this.writeSync.retry(record, confirmedAccount, write.state === 'uncertain');
    } catch (error) {
      this.globalMessageService.showError(error instanceof Error ? error.message : 'Failed to retry synchronization.');
    }
  }
}
