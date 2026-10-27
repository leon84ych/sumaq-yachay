import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagPickerComponent } from '../../../../../shared/tag-picker/tag-picker.component';
import { DomainEntryFormOverlayComponent } from '../../../shared/domain-entry-form-overlay/domain-entry-form-overlay.component';
import type { DomainRelationsComponent } from '../../domain-relations/domain-relations.component';

@Component({
  selector: 'app-relation-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    TagPickerComponent,
    DomainEntryFormOverlayComponent,
  ],
  templateUrl: './relation-form.component.html',
  styleUrl: './relation-form.component.css',
})
export class RelationFormComponent {
  readonly form = input.required<DomainRelationsComponent>();
}
