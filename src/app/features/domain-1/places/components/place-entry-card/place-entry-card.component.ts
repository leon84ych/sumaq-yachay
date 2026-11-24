import { Component, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission/permission.service';
import { parseTagsFromArray } from '../../../../../shared/tag-picker/tag-picker.mapper';
import { StudyTagDirective } from '../../../../../shared/directives/study-tag.directive';
import { DomainContributorComponent } from '../../../../domain/shared/domain-contributor/domain-contributor.component';
import { DomainEntryHeaderComponent } from '../../../../domain/shared/domain-entry-header/domain-entry-header.component';
import { PlaceRecord } from '../../model/places-model';

@Component({
  selector: 'app-place-entry-card-1',
  imports: [
    TranslocoPipe,
    DomainEntryHeaderComponent,
    DomainContributorComponent,
    StudyTagDirective,
  ],
  templateUrl: './place-entry-card.component.html',
  styleUrl: './place-entry-card.component.css',
})
export class PlaceEntryCardComponent {
  readonly row = input.required<PlaceRecord>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showContext = input(true);
  readonly deleteRequested = output<string>();
  readonly editRequested = output<PlaceRecord>();
  readonly permissions = inject(PermissionService);
  readonly role = this.permissions.role;

  splitTags(tags: string[]): string[] {
    return parseTagsFromArray(tags);
  }
}
