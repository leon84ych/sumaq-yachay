import { DatePipe } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission.service';
import { DomainEntryCardComponent } from '../../../shared/domain-entry-card/domain-entry-card.component';
import { DomainContributorComponent } from '../../../shared/domain-contributor/domain-contributor.component';
import { parseTagsFromArray } from '../../../../../shared/utils/tag-utils';
import { StudyTagDirective } from '../../../../../shared/directives/study-tag.directive';
import { BookEvent } from '../../model/book-event-row.model';

@Component({
  selector: 'app-book-event-entry-card',
  imports: [DatePipe, TranslocoPipe, DomainEntryCardComponent, DomainContributorComponent, StudyTagDirective],
  templateUrl: './book-event-entry-card.component.html',
  styleUrl: './book-event-entry-card.component.css',
})
export class BookEventEntryCardComponent {
  private readonly permissionService = inject(PermissionService);

  readonly row = input.required<BookEvent>();
  readonly mainCharacterName = input('');
  readonly secondaryCharacterNames = input<string[]>([]);
  readonly placeName = input('');
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showContext = input(false);
  readonly showActions = input(true);
  readonly editRequested = output<BookEvent>();
  readonly deleteRequested = output<string>();
  readonly role = this.permissionService.role;
  readonly permissions = this.permissionService;

  splitTags(tags: string[]): string[] {
    return parseTagsFromArray(tags);
  }
}