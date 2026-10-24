import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { MapPickerComponent } from '../../../../core/components/map-picker/map-picker.component';
import { TagPickerComponent } from '../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../../shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { DomainPlacesComponent } from '../../domain-places/domain-places.component';

@Component({
  selector: 'app-place-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    MapPickerComponent,
    TagPickerComponent,
    DomainEntryFormOverlayComponent,
  ],
  templateUrl: './place-form.component.html',
})
export class PlaceFormComponent {
  readonly form = input.required<DomainPlacesComponent>();
}
