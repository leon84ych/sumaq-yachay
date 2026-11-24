import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { MapPickerComponent } from '../../../../../core/components/map-picker/map-picker.component';
import { TagPickerComponent } from '../../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../../domain/shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { PlacesComponent } from '../../places/places.component';

@Component({
  selector: 'app-place-entry-form-1',
  imports: [
    FormsModule,
    TranslocoPipe,
    MapPickerComponent,
    TagPickerComponent,
    DomainEntryFormOverlayComponent,
  ],
  templateUrl: './place-entry-form.component.html',
})
export class PlaceEntryFormComponent {
  readonly form = input.required<PlacesComponent>();
}
