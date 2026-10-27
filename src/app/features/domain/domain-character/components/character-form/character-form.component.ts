import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagPickerComponent } from '../../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { DomainCharacterComponent } from '../../domain-character/domain-character.component';

@Component({
  selector: 'app-character-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    TagPickerComponent,
    DomainEntryFormOverlayComponent,
  ],
  templateUrl: './character-form.component.html',
})
export class CharacterFormComponent {
  readonly form = input.required<DomainCharacterComponent>();
}
