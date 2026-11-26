import { Component, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission/permission.service';
import { parseTagsFromArray } from '../../../../../shared/tag-picker/tag-picker.mapper';
import { StudyTagDirective } from '../../../../../shared/directives/study-tag.directive';
import { DomainEntryHeaderComponent } from '../../../shared/domain-entry-header/domain-entry-header.component';
import { DomainEntryFooterComponent } from '../../../shared/domain-entry-footer/domain-entry-footer.component';
import { PlaceRecord } from '../../model/places-model';

@Component({
  selector: 'app-place-entry-card',
  imports: [
    TranslocoPipe,
    DomainEntryHeaderComponent,
    DomainEntryFooterComponent,
    StudyTagDirective,
  ],
  templateUrl: './place-entry-card.component.html',
  styleUrl: './place-entry-card.component.css',
})
export class PlaceEntryCardComponent {
  readonly row = input.required<PlaceRecord>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showActions = input(true);
  readonly showFeedReview = input(false);
  readonly showContext = input(true);
  readonly deleteRequested = output<string>();
  readonly editRequested = output<PlaceRecord>();
  readonly permissions = inject(PermissionService);
  readonly role = this.permissions.role;

  splitTags(tags: string[]): string[] {
    return parseTagsFromArray(tags);
  }
}
