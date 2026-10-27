import { Component, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission.service';
import { DomainEntryHeaderComponent } from '../../../shared/domain-entry-header/domain-entry-header.component';
import { parseTags } from '../../../../../shared/utils/tag-utils';
import { PlaceRow } from '../../model/domain-place-row.model';

@Component({
  selector: 'app-place-entry-card',
  imports: [TranslocoPipe, DomainEntryHeaderComponent],
  templateUrl: './place-entry-card.component.html',
  styleUrl: './place-entry-card.component.css',
})
export class PlaceEntryCardComponent {
  readonly row = input.required<PlaceRow>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showActions = input(true);
  readonly showContext = input(false);
  readonly deleteRequested = output<string>();
  readonly editRequested = output<PlaceRow>();
  readonly permissions = inject(PermissionService);
  readonly role = this.permissions.role;

  splitTags(tags: string[] | undefined): string[] {
    return parseTags(tags);
  }
}