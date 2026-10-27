import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagPickerComponent } from '../../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { DomainAssociationComponent } from '../../domain-association/domain-association.component';

@Component({
  selector: 'app-association-form',
  standalone: true,
  imports: [FormsModule, TranslocoPipe, TagPickerComponent, DomainEntryFormOverlayComponent],
  templateUrl: './association-form.component.html',
  styleUrl: './association-form.component.css',
})
export class AssociationFormComponent {
  readonly form = input.required<DomainAssociationComponent>();
}
