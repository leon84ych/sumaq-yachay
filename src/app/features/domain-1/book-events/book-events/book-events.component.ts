import {
  Component,
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
import { GlobalErrorService } from '../../../../core/services/error/global-error.service';
import { GlobalLoadingService } from '../../../../core/services/loading/global-loading.service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { StudySearchService } from '../../../../core/services/search/study-search.service';
import {
  normalizeTagsFromArray,
  parseTagsFromArray,
} from '../../../../shared/tag-picker/tag-picker.mapper';
import { matchesStudySearch } from '../../../../shared/utils/study-search';
import { CharacterRecord } from '../../characters/model/characters-model';
import { PlaceRecord } from '../../places/model/places-model';
import { BookEventEntryCardComponent } from '../components/book-event-entry-card/book-event-entry-card.component';
import { BookEventEntryFormComponent } from '../components/book-event-entry-form/book-event-entry-form.component';
import {
  BOOK_EVENT_DEFAULT_COLOR,
  BOOK_EVENT_DEFAULT_FEED,
  BookEventRecord,
} from '../model/book-events-model';
import { BookEventDataService } from '../services/book-events.service';

@Component({
  selector: 'app-domain-book-events-1',
  imports: [FormsModule, TranslocoPipe, BookEventEntryFormComponent, BookEventEntryCardComponent],
  templateUrl: './book-events.component.html',
  styleUrl: './book-events.component.css',
})
export class BookEventsComponent implements OnInit {
  readonly bookId = input.required<string>();
  readonly isAddingEntry = input(false);
  readonly closeEntry = output<void>();

  readonly rows = signal<BookEventRecord[]>([]);
  readonly characters = signal<CharacterRecord[]>([]);
  readonly places = signal<PlaceRecord[]>([]);
  readonly bookName = signal('');
  readonly bookAuthor = signal('');
  readonly bookRow = signal<number | null>(null);
  private readonly allowedTags = signal<ReadonlySet<string>>(new Set());

  readonly editingId = signal<string | null>(null);
  readonly searchTerm = inject(StudySearchService).query;
  readonly newMainCharacterId = signal('');
  readonly newSecondaryCharacterIds = signal<string[]>([]);
  readonly newPlaceId = signal('');
  readonly newDateTimeStart = signal('');
  readonly newDateTimeEnd = signal('');
  readonly newDateLabel = signal('');
  readonly newEventOrder = signal(1);
  readonly newEvent = signal('');
  readonly newDescription = signal('');
  readonly newColor = signal(BOOK_EVENT_DEFAULT_COLOR);
  readonly newPage = signal('');
  readonly newTags = signal<string[]>([]);
  readonly optionsLoadState = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  readonly submitted = signal(false);
  readonly isSaving = signal(false);

  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;
  private readonly dataService = inject(BookEventDataService);
  private readonly globalErrorService = inject(GlobalErrorService);
  private readonly globalLoadingService = inject(GlobalLoadingService);
  private readonly transloco = inject(TranslocoService);

  readonly invalidTagsDetected = computed(() => {
    const allowed = this.allowedTags();
    return parseTagsFromArray(this.newTags()).filter(
      (tag) => !allowed.has(normalizeTagsFromArray([tag])[0]),
    );
  });

  readonly isMainCharacterInvalid = computed(
    () => !this.characters().some((character) => character.id === this.newMainCharacterId()),
  );
  readonly isEventInvalid = computed(() => !this.newEvent().trim());
  readonly isDescriptionInvalid = computed(() => !this.newDescription().trim());
  readonly isFormInvalid = computed(() => {
    return (
      this.isMainCharacterInvalid() ||
      this.isEventInvalid() ||
      this.isDescriptionInvalid() ||
      this.newDescription().length > 1000 ||
      this.isEventOrderInvalid() ||
      this.invalidTagsDetected().length > 0
    );
  });
  readonly isEventOrderInvalid = computed(
    () => !Number.isFinite(this.newEventOrder()) || this.newEventOrder() < 1,
  );

  readonly orderedRows = computed(() => {
    const rows = [...this.rows()];
    const hasCompleteDates =
      rows.length > 0 && rows.every((row) => this.parseDate(row.dateTimeStart) !== null);
    return rows.sort((left, right) =>
      hasCompleteDates
        ? this.parseDate(left.dateTimeStart)! - this.parseDate(right.dateTimeStart)!
        : left.eventOrder - right.eventOrder,
    );
  });

  readonly filteredRows = computed(() => {
    const query = this.searchTerm().trim();
    if (!query) {
      return this.orderedRows();
    }

    const bookName = this.bookName();
    const bookAuthor = this.bookAuthor();
    return this.orderedRows().filter((row) =>
      matchesStudySearch(
        query,
        [
          bookName,
          bookAuthor,
          'book events',
          'eventos',
          row.event,
          row.description,
          row.dateLabel ?? '',
          row.book,
          row.author,
          row.page,
          row.contributor,
          this.characterName(row.mainCharacterId),
          ...row.secondaryCharacterIds.map((id) => this.characterName(id)),
          row.placeId ? this.placeName(row.placeId) : '',
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
    effect(() => {
      const formOpen = this.isAddingEntry() || this.editingId() !== null;
      if (!formOpen) {
        if (this.optionsLoadState() === 'error') {
          this.optionsLoadState.set('idle');
        }
        return;
      }
      if (this.optionsLoadState() === 'ready' || this.optionsLoadState() === 'loading') {
        return;
      }
      untracked(() => void this.loadOptions());
    });

    effect(() => {
      const nextOrder = Math.max(0, ...this.rows().map((row) => row.eventOrder)) + 1;
      if (this.editingId() === null) {
        this.newEventOrder.set(nextOrder);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const book = await this.dataService.getBookRecord(this.bookId());
      this.bookName.set(book?.name ?? '');
      this.bookAuthor.set(book?.author ?? '');
      this.bookRow.set(book?.row ?? null);
      await this.refreshAllowedTags();
      this.rows.set(await this.dataService.getRecords(this.bookId()));
      await this.loadOptions();
    } catch (error) {
      this.showError(error, 'Failed to load book events.');
    }
  }

  async refreshAllowedTags(): Promise<void> {
    try {
      const tags = await this.dataService.getAllowedTags(this.bookId());
      this.allowedTags.set(new Set(normalizeTagsFromArray(tags)));
    } catch (error) {
      this.showError(error, 'Failed to load book tags.');
    }
  }

  async loadOptions(): Promise<void> {
    if (this.optionsLoadState() === 'loading' || this.optionsLoadState() === 'ready') {
      return;
    }
    this.optionsLoadState.set('loading');
    try {
      const [characters, places] = await Promise.all([
        this.dataService.getCharacters(this.bookId()),
        this.dataService.getPlaces(this.bookId()),
      ]);
      this.characters.set(characters);
      this.places.set(places);
      this.optionsLoadState.set('ready');
    } catch {
      this.optionsLoadState.set('error');
    }
  }

  characterName(id: string): string {
    return this.characters().find((character) => character.id === id)?.name ?? id;
  }

  secondaryCharacterNames(ids: string[]): string[] {
    return ids.map((id) => this.characterName(id));
  }

  placeName(id: string): string {
    return this.places().find((place) => place.id === id)?.name ?? id;
  }

  toggleSecondaryCharacter(id: string, selected: boolean): void {
    this.newSecondaryCharacterIds.update((ids) =>
      selected ? (ids.includes(id) ? ids : [...ids, id]) : ids.filter((item) => item !== id),
    );
  }

  splitTags(tags: string[]): string[] {
    return parseTagsFromArray(tags);
  }

  async deleteEntry(id: string): Promise<void> {
    if (!window.confirm(this.transloco.translate('COMMON.CONFIRM_DELETE'))) {
      return;
    }
    const record = this.rows().find((row) => row.id === id);
    if (!record) {
      return;
    }
    try {
      await this.dataService.deleteDomainItem(record);
      this.rows.update((rows) => rows.filter((row) => row.id !== id));
    } catch (error) {
      this.showError(error, 'Failed to delete book event.');
    }
  }

  editEntry(record: BookEventRecord): void {
    this.submitted.set(false);
    this.editingId.set(record.id);
    this.newMainCharacterId.set(record.mainCharacterId);
    this.newSecondaryCharacterIds.set([...record.secondaryCharacterIds]);
    this.newPlaceId.set(record.placeId ?? '');
    this.newDateTimeStart.set(this.toLocalDateTime(record.dateTimeStart));
    this.newDateTimeEnd.set(this.toLocalDateTime(record.dateTimeEnd));
    this.newDateLabel.set(record.dateLabel ?? '');
    this.newEventOrder.set(record.eventOrder);
    this.newEvent.set(record.event);
    this.newDescription.set(record.description);
    this.newColor.set(record.color);
    this.newPage.set(record.page);
    this.newTags.set(record.tags);
  }

  resetForm(): void {
    this.submitted.set(false);
    this.editingId.set(null);
    this.newMainCharacterId.set('');
    this.newSecondaryCharacterIds.set([]);
    this.newPlaceId.set('');
    this.newDateTimeStart.set('');
    this.newDateTimeEnd.set('');
    this.newDateLabel.set('');
    this.newEvent.set('');
    this.newDescription.set('');
    this.newColor.set(BOOK_EVENT_DEFAULT_COLOR);
    this.newPage.set('');
    this.newTags.set([]);
    this.closeEntry.emit();
  }

  async saveEvent(): Promise<void> {
    if (this.isSaving()) {
      return;
    }
    this.submitted.set(true);
    if (this.isFormInvalid()) {
      return;
    }

    const editingId = this.editingId();
    const original = editingId ? this.rows().find((row) => row.id === editingId) : undefined;
    if (editingId && !original) {
      this.globalErrorService.show('The book event being edited is no longer available.');
      return;
    }

    const bookRow = this.bookRow() ?? original?.bookRow;
    if (!bookRow) {
      this.globalErrorService.show('Book record is missing row.');
      return;
    }

    const record: BookEventRecord = {
      id: editingId ?? `book_events_${Date.now()}`,
      bookId: this.bookId(),
      bookRow,
      itemRow: original?.itemRow ?? 0,
      mainCharacterId: this.newMainCharacterId(),
      secondaryCharacterIds: [...new Set(this.newSecondaryCharacterIds())],
      placeId: this.newPlaceId().trim() || undefined,
      dateTimeStart: this.toIsoDateTime(this.newDateTimeStart()) || undefined,
      dateTimeEnd: this.toIsoDateTime(this.newDateTimeEnd()) || undefined,
      dateLabel: this.newDateLabel().trim() || undefined,
      eventOrder: this.newEventOrder(),
      event: this.newEvent().trim(),
      description: this.newDescription().trim(),
      color: this.newColor(),
      book: this.bookName().trim(),
      author: this.bookAuthor().trim(),
      page: this.newPage().trim(),
      tags: normalizeTagsFromArray(this.newTags()),
      feed: original?.feed ?? BOOK_EVENT_DEFAULT_FEED,
      contributor: original?.contributor ?? '',
      syncStatus: 'pending',
    };

    const operation = this.globalLoadingService.begin();
    this.isSaving.set(true);
    try {
      const saved = editingId
        ? await this.dataService.updateDomainItem(record)
        : await this.dataService.addDomainItem(record);
      this.rows.update((rows) => {
        const index = rows.findIndex((row) => row.id === record.id);
        return index === -1
          ? [...rows, saved]
          : rows.map((row) => (row.id === record.id ? saved : row));
      });
      this.resetForm();
    } catch (error) {
      this.showError(error, 'Failed to save book event.');
    } finally {
      this.isSaving.set(false);
      this.globalLoadingService.end(operation);
    }
  }

  private parseDate(value: string | undefined): number | null {
    if (!value) {
      return null;
    }
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  private toLocalDateTime(value: string | undefined): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
      return '';
    }
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
  }

  private toIsoDateTime(value: string): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  private showError(error: unknown, fallback: string): void {
    this.globalErrorService.show(error instanceof Error ? error.message : fallback);
  }
}
