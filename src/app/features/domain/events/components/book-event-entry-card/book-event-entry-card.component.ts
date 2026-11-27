import { DatePipe } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission/permission.service';
import { DomainEntryCardComponent } from '../../../shared/domain-entry-card/domain-entry-card.component';
import { DomainEntryFooterComponent } from '../../../shared/domain-entry-footer/domain-entry-footer.component';
import { DomainSyncControlsComponent } from '../../../shared/domain-sync-controls/domain-sync-controls.component';
import { StudyTagDirective } from '../../../../../shared/directives/study-tag.directive';
import { parseTagsFromArray } from '../../../../../shared/tag-picker/tag-picker.mapper';
import { EventRecord } from '../../model/event-model';

@Component({
  selector: 'app-book-event-entry-card',
  imports: [
    DatePipe,
    TranslocoPipe,
    DomainEntryCardComponent,
    DomainEntryFooterComponent,
    DomainSyncControlsComponent,
    StudyTagDirective,
  ],
  templateUrl: './book-event-entry-card.component.html',
  styleUrl: './book-event-entry-card.component.css',
})
export class BookEventEntryCardComponent {
  readonly row = input.required<EventRecord>();
  readonly mainCharacterName = input('');
  readonly secondaryCharacterNames = input<string[]>([]);
  readonly placeName = input('');
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showActions = input(true);
  readonly canRetry = input(false);
  readonly pendingDeletion = input(false);
  readonly retryRequested = output<EventRecord>();
  readonly showContext = input(true);
  readonly editRequested = output<EventRecord>();
  readonly deleteRequested = output<string>();
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;

  splitTags(tags: string[]): string[] {
    return parseTagsFromArray(tags);
  }
}
