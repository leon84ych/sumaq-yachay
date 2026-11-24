import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagPickerComponent } from '../../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../../domain/shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { CharactersComponent } from '../../characters/characters.component';

@Component({
  selector: 'app-character-entry-form-1',
  imports: [FormsModule, TranslocoPipe, TagPickerComponent, DomainEntryFormOverlayComponent],
  templateUrl: './character-entry-form.component.html',
})
export class CharacterEntryFormComponent {
  readonly form = input.required<CharactersComponent>();
}
