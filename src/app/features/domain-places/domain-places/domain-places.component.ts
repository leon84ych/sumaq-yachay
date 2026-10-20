import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { DomainDataService } from '../../catalog-detail/services/domain-data.service';
import { DomainSheet } from '../../catalog-detail/models/domain-sheet.model';
import { TagPickerComponent } from '../../../shared/tag-picker.component';
import { MapPickerComponent } from '../../../core/components/map-picker/map-picker.component';
import { PlaceRow } from '../model/domain-place-row.model';
import { TaxonomyService } from '../../../core/services/taxonomy/taxonomy.service';
import { PermissionService } from '../../../core/services/permission.service';
import { PlaceEntryCardComponent } from '../components/place-entry-card/place-entry-card.component';

@Component({
    selector: 'app-places',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslocoPipe,
        TagPickerComponent,
        MapPickerComponent,
        PlaceEntryCardComponent,
    ],
    templateUrl: './domain-places.component.html',
    styleUrls: ['./domain-places.component.css'],
})
export class DomainPlacesComponent {
    readonly rows = input.required<PlaceRow[]>();
    readonly currentSheet = input.required<DomainSheet>();
    readonly bookName = input<string>('');
    readonly isAddingEntry = input<boolean>(false);
    readonly closeEntry = output<void>();

    readonly searchTerm = signal<string>('');
    readonly newTags = signal<string>('');
    readonly editingId = signal<string | null>(null);

    // Individual domain signals for the PLACES feature
    readonly newName = signal<string>('');
    readonly newType = signal<'city' | 'country' | 'building' | 'region' | 'institution'>('city');
    readonly newNature = signal<'real' | 'fictional' | 'inspired'>('real');
    readonly newCoordinates = signal<string>('');
    readonly newColor = signal<string>('#3b82f6'); // Default color picker fallback
    readonly newDescription = signal<string>('');
    readonly newSource = signal<string>('');

    private domainDataService = inject(DomainDataService);
    private globalErrorService = inject(GlobalErrorService);
    private readonly transloco = inject(TranslocoService);
    private readonly taxonomyService = inject(TaxonomyService);
    readonly permissionService = inject(PermissionService);
    readonly role = this.permissionService.role;

    /**
     * 1. REAL-TIME SIGNAL VALIDATION GUARD
     * Parses newTags() mutations and isolates tokens missing from the master INDEX whitelist matrix.
     */
    readonly invalidTagsDetected = computed<string[]>(() => {
        const activeTokens = this.splitTags(this.newTags());
        const forbidden: string[] = [];

        for (const token of activeTokens) {
            if (!this.taxonomyService.isTagAllowed(token)) {
                forbidden.push(token);
            }
        }
        return forbidden;
    });

    /**
     * 2. EXPLICIT FORM INHERENT VALIDATION CAP
     * Evaluates if base domain payload criteria or strict global tag constraints are breached.
     */
    readonly isFormInvalid = computed<boolean>(() => {
        return !this.newName().trim() || this.invalidTagsDetected().length > 0;
    });

    readonly filteredRows = computed(() => {
        const query = this.searchTerm().trim().toLocaleLowerCase();
        if (!query) return this.rows();

        return this.rows().filter((row) =>
            Object.values(row).some((val) =>
                String(val ?? '').toLocaleLowerCase().includes(query)
            )
        );
    });

    splitTags(tags: string): string[] {
        return tags
            .split(/[\s,;]+/)
            .map((tag) => tag.trim())
            .filter(Boolean);
    }

    async deleteEntry(id: string): Promise<void> {
        if (!window.confirm(this.transloco.translate('COMMON.CONFIRM_DELETE'))) {
            return;
        }

        try {
            await this.domainDataService.deleteDomainRow(this.currentSheet().name, id);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete place.';
            this.globalErrorService.show(message);
        }
    }

    editEntry(row: PlaceRow): void {
        this.editingId.set(row.id);
        this.newName.set(row.name);
        this.newType.set(row.type);
        this.newNature.set(row.nature);
        this.newCoordinates.set(row.coordinates ?? '');
        this.newColor.set(row.color);
        this.newDescription.set(row.description ?? '');
        this.newSource.set(row.source ?? '');
        this.newTags.set(row.tags ?? '');
    }

    async addEntry(): Promise<void> {
        if (this.isFormInvalid()) {
            this.globalErrorService.show('Cannot add entry: Please remove unauthorized tags.');
            return;
        }

        const name = this.newName().trim();
        const type = this.newType();
        const nature = this.newNature();
        const coordinates = this.newCoordinates().trim();
        const color = this.newColor();
        const description = this.newDescription().trim();
        const source = this.newSource().trim();
        const tags = this.splitTags(this.newTags()).join(' ');
        const editingId = this.editingId();

        try {
            const localRows = editingId
                ? (await this.domainDataService.getLocalDomainSheetRows(this.currentSheet().name)) as PlaceRow[]
                : this.rows();
            const existingRows = localRows.length > 0 ? localRows : this.rows();
            const originalRow = editingId
                ? existingRows.find((row) => row.id === editingId)
                : undefined;
            if (editingId && !originalRow) {
                throw new Error('The place being edited is no longer available.');
            }

            const newRow: PlaceRow = {
                ...(originalRow ?? {}),
                id: editingId ?? `places_${Date.now()}`,
                name,
                type,
                nature,
                coordinates: coordinates || undefined,
                color,
                description: description || undefined,
                source: source || undefined,
                tags: tags || undefined,
                feed: originalRow?.feed ?? 5,
                contributor: originalRow?.contributor ?? 'currentUser',
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
            const message = error instanceof Error ? error.message : 'Failed to add place entry.';
            this.globalErrorService.show(message);
        }
    }

    resetForm(): void {
        this.editingId.set(null);
        this.newName.set('');
        this.newType.set('city');
        this.newNature.set('real');
        this.newCoordinates.set('');
        this.newColor.set('#3b82f6');
        this.newDescription.set('');
        this.newSource.set('');
        this.newTags.set('');
        this.closeEntry.emit();
    }
}
