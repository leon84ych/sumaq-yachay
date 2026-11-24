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
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { StudySearchService } from '../../../../core/services/search/study-search.service';
import {
  normalizeTagsFromArray,
  parseTagsFromArray,
} from '../../../../shared/tag-picker/tag-picker.mapper';
import { matchesStudySearch } from '../../../../shared/utils/study-search';
import { PlaceEntryCardComponent } from '../components/place-entry-card/place-entry-card.component';
import { PlaceEntryFormComponent } from '../components/place-entry-form/place-entry-form.component';
import { PlacesMapComponent } from '../components/places-map/places-map.component';
import {
  PLACE_DEFAULT_COLOR,
  PLACE_DEFAULT_FEED,
  PLACE_NATURES,
  PLACE_TYPES,
  PlaceNature,
  PlaceRecord,
  PlaceType,
} from '../model/places-model';
import { PlaceDataService } from '../services/places.service';

@Component({
  selector: 'app-domain-places-1',
  imports: [
    FormsModule,
    TranslocoPipe,
    PlaceEntryFormComponent,
    PlaceEntryCardComponent,
    PlacesMapComponent,
  ],
  templateUrl: './places.component.html',
  styleUrl: './places.component.css',
})
export class PlacesComponent implements OnInit {
  readonly bookId = input.required<string>();
  readonly isAddingEntry = input(false);
  readonly closeEntry = output<void>();

  readonly rows = signal<PlaceRecord[]>([]);
  readonly bookName = signal('');
  readonly bookAuthor = signal('');
  readonly bookRow = signal<number | null>(null);
  private readonly allowedTags = signal<ReadonlySet<string>>(new Set());

  readonly placeTypes = PLACE_TYPES;
  readonly placeNatures = PLACE_NATURES;
  readonly searchTerm = inject(StudySearchService).query;
  readonly showMap = signal(false);
  readonly newTags = signal<string[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly isSaving = signal(false);

  readonly newName = signal('');
  readonly newType = signal<PlaceType>('city');
  readonly newNature = signal<PlaceNature>('real');
  readonly newCoordinates = signal('');
  readonly newColor = signal(PLACE_DEFAULT_COLOR);
  readonly newDescription = signal('');
  readonly newSource = signal('');

  private readonly placeDataService = inject(PlaceDataService);
  private readonly globalErrorService = inject(GlobalErrorService);
  private readonly transloco = inject(TranslocoService);
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;

  readonly invalidTagsDetected = computed(() => {
    const allowed = this.allowedTags();
    return parseTagsFromArray(this.newTags()).filter(
      (tag) => !allowed.has(normalizeTagsFromArray([tag])[0]),
    );
  });

  readonly isFormInvalid = computed(
    () => !this.newName().trim() || this.invalidTagsDetected().length > 0,
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
            'places',
            'lugares',
            row.name,
            row.type,
            row.nature,
            row.coordinates ?? '',
            row.color,
            row.description ?? '',
            row.source ?? '',
            row.contributor,
            ...row.tags,
          ],
          row.tags,
          { book: bookName, author: bookAuthor, contributor: row.contributor },
        ),
    );
  });

  constructor() {
    effect(() => {
      if (this.isAddingEntry()) {
        untracked(() => void this.refreshAllowedTags());
      }
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const book = await this.placeDataService.getBookRecord(this.bookId());
      this.bookName.set(book?.name ?? '');
      this.bookAuthor.set(book?.author ?? '');
      this.bookRow.set(book?.row ?? null);
      await this.refreshAllowedTags();
      this.rows.set(await this.placeDataService.getRecords(this.bookId()));
    } catch (error) {
      this.showError(error, 'Failed to load places.');
    }
  }

  async refreshAllowedTags(): Promise<void> {
    try {
      const tags = await this.placeDataService.getAllowedTags(this.bookId());
      this.allowedTags.set(new Set(normalizeTagsFromArray(tags)));
    } catch (error) {
      this.showError(error, 'Failed to load book tags.');
    }
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
      await this.placeDataService.deleteDomainItem(record);
      this.rows.update((rows) => rows.filter((row) => row.id !== id));
    } catch (error) {
      this.showError(error, 'Failed to delete place.');
    }
  }

  editEntry(record: PlaceRecord): void {
    this.editingId.set(record.id);
    this.newName.set(record.name);
    this.newType.set(record.type);
    this.newNature.set(record.nature);
    this.newCoordinates.set(record.coordinates ?? '');
    this.newColor.set(record.color);
    this.newDescription.set(record.description ?? '');
    this.newSource.set(record.source ?? '');
    this.newTags.set(record.tags);
    void this.refreshAllowedTags();
  }

  resetForm(): void {
    this.editingId.set(null);
    this.newName.set('');
    this.newType.set('city');
    this.newNature.set('real');
    this.newCoordinates.set('');
    this.newColor.set(PLACE_DEFAULT_COLOR);
    this.newDescription.set('');
    this.newSource.set('');
    this.newTags.set([]);
    this.closeEntry.emit();
  }

  async saveEntry(): Promise<void> {
    if (this.isSaving()) {
      return;
    }
    if (this.isFormInvalid()) {
      this.globalErrorService.show('Cannot save place: Please remove unauthorized tags.');
      return;
    }

    const editingId = this.editingId();
    const original = editingId ? this.rows().find((row) => row.id === editingId) : undefined;
    if (editingId && !original) {
      this.globalErrorService.show('The place being edited is no longer available.');
      return;
    }

    const bookRow = this.bookRow() ?? original?.bookRow;
    if (!bookRow) {
      this.globalErrorService.show('Book record is missing row.');
      return;
    }

    const record: PlaceRecord = {
      id: editingId ?? `places_${Date.now()}`,
      bookId: this.bookId(),
      bookRow,
      itemRow: original?.itemRow ?? 0,
      name: this.newName().trim(),
      type: this.newType(),
      nature: this.newNature(),
      coordinates: this.newCoordinates().trim() || undefined,
      color: this.newColor(),
      description: this.newDescription().trim() || undefined,
      source: this.newSource().trim() || undefined,
      tags: normalizeTagsFromArray(this.newTags()),
      feed: original?.feed ?? PLACE_DEFAULT_FEED,
      contributor: original?.contributor ?? '',
      syncStatus: 'pending',
    };

    this.isSaving.set(true);
    try {
      const saved = editingId
        ? await this.placeDataService.updateDomainItem(record)
        : await this.placeDataService.addDomainItem(record);
      this.rows.update((rows) => {
        const index = rows.findIndex((row) => row.id === record.id);
        return index === -1
          ? [...rows, saved]
          : rows.map((row, rowIndex) => (rowIndex === index ? saved : row));
      });
      this.resetForm();
    } catch (error) {
      this.showError(error, 'Failed to save place.');
    } finally {
      this.isSaving.set(false);
    }
  }

  private showError(error: unknown, fallback: string): void {
    this.globalErrorService.show(error instanceof Error ? error.message : fallback);
  }
}
