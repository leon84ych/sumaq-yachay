import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagPickerComponent } from '../../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { RelationsComponent } from '../../relations/relations.component';

@Component({
  selector: 'app-relation-entry-form',
  imports: [FormsModule, TranslocoPipe, TagPickerComponent, DomainEntryFormOverlayComponent],
  templateUrl: './relation-entry-form.component.html',
})
export class RelationEntryFormComponent {
  readonly form = input.required<RelationsComponent>();
}
