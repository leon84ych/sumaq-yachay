import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { DomainDataService } from '../../catalog-detail/services/domain-data.service';
import { DomainSheet } from '../../catalog-detail/models/domain-sheet.model';
import { TagPickerComponent } from '../../../shared/tag-picker.component';
import { MapPickerComponent } from '../../../core/components/map-picker/map-picker.component';
import { PlaceRow } from '../model/domain-place-row.model';

@Component({
    selector: 'app-places',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslocoPipe, TagPickerComponent, MapPickerComponent],
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

    // Signals individuales para los campos del dominio PLACES
    readonly newName = signal<string>('');
    readonly newType = signal<'city' | 'country' | 'building' | 'region' | 'institution'>('city');
    readonly newNature = signal<'real' | 'fictional' | 'inspired'>('real');
    readonly newCoordinates = signal<string>('');
    readonly newColor = signal<string>('#3b82f6'); // Selector de color por defecto
    readonly newDescription = signal<string>('');
    readonly newSource = signal<string>('');

    readonly filteredRows = computed(() => {
        const query = this.searchTerm().trim().toLocaleLowerCase();
        if (!query) return this.rows();

        return this.rows().filter((row) =>
            Object.values(row).some((val) =>
                String(val ?? '').toLocaleLowerCase().includes(query)
            )
        );
    });

    private domainDataService = inject(DomainDataService);
    private globalErrorService = inject(GlobalErrorService);

    splitTags(tags: string): string[] {
        return tags
            .split(/[\s,;]+/)
            .map((tag) => tag.trim())
            .filter(Boolean);
    }

    async addEntry(): Promise<void> {
        const name = this.newName().trim();
        const type = this.newType();
        const nature = this.newNature();
        const coordinates = this.newCoordinates().trim();
        const color = this.newColor();
        const description = this.newDescription().trim();
        const source = this.newSource().trim();
        const tags = this.splitTags(this.newTags()).join(' ');

        if (!name) {
            return;
        }

        const newRow: PlaceRow = {
            id: `places_${Date.now()}`,
            name,
            type,
            nature,
            ...(coordinates ? { coordinates } : {}),
            color,
            ...(description ? { description } : {}),
            ...(source ? { source } : {}),
            ...(tags ? { tags } : {}),
            feed: 5,
            contributor: 'currentUser',
            syncStatus: 'pending',
        };

        try {
            await this.domainDataService.updateDomainSheetRows(this.currentSheet().name, [
                ...this.rows(),
                newRow,
            ]);
            this.resetForm();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add place entry.';
            this.globalErrorService.show(message);
        }
    }

    resetForm(): void {
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