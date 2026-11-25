import { DatePipe } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission/permission.service';
import { DomainEntryCardComponent } from '../../../shared/domain-entry-card/domain-entry-card.component';
import { DomainContributorComponent } from '../../../shared/domain-contributor/domain-contributor.component';
import { StudyTagDirective } from '../../../../../shared/directives/study-tag.directive';
import { parseTagsFromArray } from '../../../../../shared/tag-picker/tag-picker.mapper';
import { BookEventRecord } from '../../model/book-events-model';

@Component({
  selector: 'app-book-event-entry-card-1',
  imports: [
    DatePipe,
    TranslocoPipe,
    DomainEntryCardComponent,
    DomainContributorComponent,
    StudyTagDirective,
  ],
  templateUrl: './book-event-entry-card.component.html',
  styleUrl: './book-event-entry-card.component.css',
})
export class BookEventEntryCardComponent {
  readonly row = input.required<BookEventRecord>();
  readonly mainCharacterName = input('');
  readonly secondaryCharacterNames = input<string[]>([]);
  readonly placeName = input('');
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showActions = input(true);
  readonly showContext = input(true);
  readonly editRequested = output<BookEventRecord>();
  readonly deleteRequested = output<string>();
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;

  splitTags(tags: string[]): string[] {
    return parseTagsFromArray(tags);
  }
}
