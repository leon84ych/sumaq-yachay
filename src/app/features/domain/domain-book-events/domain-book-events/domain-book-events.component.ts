import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../../core/services/global-error.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { TaxonomyService } from '../../../../core/services/taxonomy/taxonomy.service';
import { parseTags, serializeTags } from '../../../../shared/utils/tag-utils';
import { DomainSheet } from '../../../catalog-detail/models/domain-sheet.model';
import { DomainDataService } from '../../../catalog-detail/services/domain-data.service';
import { CharacterRow } from '../../domain-character/models/domain-character-row.model';
import { PlaceRow } from '../../domain-places/model/domain-place-row.model';
import { BookEventEntryCardComponent } from '../components/book-event-entry-card/book-event-entry-card.component';
import { BookEvent } from '../model/book-event-row.model';

import { BookEventFormComponent } from '../components/book-event-form/book-event-form.component';

@Component({
  selector: 'app-domain-book-events',
  standalone: true,
  imports: [
    BookEventFormComponent,
    BookEventFormComponent,
    CommonModule,
    FormsModule,
    TranslocoPipe,
    BookEventEntryCardComponent,
  ],
  templateUrl: './domain-book-events.component.html',
  styleUrl: './domain-book-events.component.css',
})
export class DomainBookEventsComponent {
  readonly rows = input.required<BookEvent[]>();
  readonly currentSheet = input.required<DomainSheet>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly isAddingEntry = input(false);
  readonly closeEntry = output<void>();

  readonly searchTerm = signal('');
  readonly editingId = signal<string | null>(null);
  readonly newMainCharacterId = signal('');
  readonly newSecondaryCharacterIds = signal<string[]>([]);
  readonly newPlaceId = signal('');
  readonly newDateTimeStart = signal('');
  readonly newDateTimeEnd = signal('');
  readonly newDateLabel = signal('');
  readonly newEventOrder = signal(1);
  readonly newEvent = signal('');
  readonly newDescription = signal('');
  readonly newColor = signal('#D4A373');
  readonly newPage = signal('');
  readonly newTags = signal<string[]>([]);

  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;
  private readonly domainDataService = inject(DomainDataService);
  private readonly globalErrorService = inject(GlobalErrorService);
  private readonly transloco = inject(TranslocoService);
  private readonly taxonomyService = inject(TaxonomyService);

  readonly characters = computed<CharacterRow[]>(
    () =>
      (this.domainDataService.sheets().find((sheet) => sheet.name.toUpperCase() === 'CHARACTER')
        ?.rows ?? []) as unknown as CharacterRow[],
  );
  readonly places = computed<PlaceRow[]>(
    () =>
      (this.domainDataService.sheets().find((sheet) => sheet.name.toUpperCase() === 'PLACES')
        ?.rows ?? []) as unknown as PlaceRow[],
  );
  readonly invalidTagsDetected = computed(() =>
    this.splitTags(this.newTags()).filter((tag) => !this.taxonomyService.isTagAllowed(tag)),
  );
  readonly isFormInvalid = computed(
    () =>
      !this.newMainCharacterId() ||
      !this.newEvent().trim() ||
      !this.newDescription().trim() ||
      !this.bookName().trim() ||
      !this.bookAuthor().trim() ||
      !Number.isFinite(this.newEventOrder()) ||
      this.invalidTagsDetected().length > 0,
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
    const query = this.normalizeSearch(this.searchTerm());
    if (!query) {
      return this.orderedRows();
    }

    return this.orderedRows().filter((event) =>
      [
        event.event,
        event.description,
        event.dateLabel ?? '',
        event.book,
        event.author,
        event.page,
        ...event.tags,
        this.characterName(event.mainCharacterId),
        ...event.secondaryCharacterIds.map((id) => this.characterName(id)),
        event.placeId ? this.placeName(event.placeId) : '',
      ].some((value) => this.normalizeSearch(value).includes(query)),
    );
  });

  constructor() {
    effect(() => {
      const nextOrder = Math.max(0, ...this.rows().map((event) => event.eventOrder)) + 1;
      if (this.editingId() === null) {
        this.newEventOrder.set(nextOrder);
      }
    });
  }

  characterName(id: string): string {
    return this.characters().find((character) => character.id === id)?.name ?? id;
  }

  toggleSecondaryCharacter(id: string, isSelected: boolean): void {
    this.newSecondaryCharacterIds.update((selectedIds) => {
      if (isSelected) {
        return selectedIds.includes(id) ? selectedIds : [...selectedIds, id];
      }
      return selectedIds.filter((selectedId) => selectedId !== id);
    });
  }

  secondaryCharacterNames(ids: string[]): string[] {
    return ids.map((id) => this.characterName(id));
  }

  placeName(id: string): string {
    return this.places().find((place) => place.id === id)?.name ?? id;
  }

  splitTags(value: string[]): string[] {
    return parseTags(value);
  }

  async deleteEntry(id: string): Promise<void> {
    if (!window.confirm(this.transloco.translate('COMMON.CONFIRM_DELETE'))) {
      return;
    }

    try {
      await this.domainDataService.deleteDomainRow(this.currentSheet().name, id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete book event.';
      this.globalErrorService.show(message);
    }
  }

  editEntry(event: BookEvent): void {
    this.editingId.set(event.id);
    this.newMainCharacterId.set(event.mainCharacterId);
    this.newSecondaryCharacterIds.set([...event.secondaryCharacterIds]);
    this.newPlaceId.set(event.placeId ?? '');
    this.newDateTimeStart.set(this.toLocalDateTime(event.dateTimeStart));
    this.newDateTimeEnd.set(this.toLocalDateTime(event.dateTimeEnd));
    this.newDateLabel.set(event.dateLabel ?? '');
    this.newEventOrder.set(event.eventOrder);
    this.newEvent.set(event.event);
    this.newDescription.set(event.description);
    this.newColor.set(event.color);
    this.newPage.set(event.page);
    this.newTags.set(event.tags);
  }

  async addEvent(): Promise<void> {
    if (this.isFormInvalid()) {
      this.globalErrorService.show('Cannot add event: Please remove unauthorized tags.');
      return;
    }

    const mainCharacterId = this.newMainCharacterId();
    const secondaryCharacterIds = [...new Set(this.newSecondaryCharacterIds())];
    const placeId = this.newPlaceId().trim() || undefined;
    const dateTimeStart = this.toIsoDateTime(this.newDateTimeStart());
    const dateTimeEnd = this.toIsoDateTime(this.newDateTimeEnd());
    const dateLabel = this.newDateLabel().trim() || undefined;
    const eventOrder = this.newEventOrder();
    const eventName = this.newEvent().trim();
    const description = this.newDescription().trim();
    const color = this.newColor();
    const book = this.bookName().trim();
    const author = this.bookAuthor().trim();
    const page = this.newPage().trim();
    const tags = serializeTags(
      this.splitTags(this.newTags()).filter((tag) => this.taxonomyService.isTagAllowed(tag)),
    );
    const editingId = this.editingId();

    try {
      const localRows = editingId
        ? ((await this.domainDataService.getLocalDomainSheetRows(
            this.currentSheet().name,
          )) as BookEvent[])
        : this.rows();
      const existingRows = localRows.length > 0 ? localRows : this.rows();
      const originalRow = editingId ? existingRows.find((row) => row.id === editingId) : undefined;
      if (editingId && !originalRow) {
        throw new Error('The book event being edited is no longer available.');
      }

      const newRow: BookEvent = {
        ...(originalRow ?? {}),
        id: editingId ?? `book_event_${Date.now()}`,
        row: originalRow?.row ?? existingRows.length + 1,
        mainCharacterId,
        secondaryCharacterIds,
        placeId,
        dateTimeStart,
        dateTimeEnd,
        dateLabel,
        eventOrder,
        event: eventName,
        description,
        color,
        book,
        author,
        page,
        tags,
        feed: originalRow?.['feed'] ?? 5,
        contributor: originalRow?.['contributor'] ?? 'currentUser',
        syncStatus: 'pending',
      };
      const updatedRows = editingId
        ? existingRows.map((row) => (row.id === editingId ? newRow : row))
        : [...existingRows, newRow];

      await this.domainDataService.updateDomainSheetRows(
        this.currentSheet().name,
        updatedRows,
        true,
        editingId ?? undefined,
        editingId ? undefined : newRow.id,
      );
      this.resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save book event.';
      this.globalErrorService.show(message);
    }
  }

  resetForm(): void {
    this.editingId.set(null);
    this.newMainCharacterId.set('');
    this.newSecondaryCharacterIds.set([]);
    this.newPlaceId.set('');
    this.newDateTimeStart.set('');
    this.newDateTimeEnd.set('');
    this.newDateLabel.set('');
    this.newEvent.set('');
    this.newDescription.set('');
    this.newColor.set('#D4A373');
    this.newPage.set('');
    this.newTags.set([]);
    this.closeEntry.emit();
  }

  private normalizeSearch(value: string): string {
    return value
      .trim()
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private parseDate(value: string | undefined): number | null {
    if (!value) {
      return null;
    }
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  private toLocalDateTime(value: string | undefined): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  }

  private toIsoDateTime(value: string): string | undefined {
    if (!value) {
      return undefined;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
}
