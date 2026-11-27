import { Component, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission/permission.service';
import { parseTagsFromArray } from '../../../../../shared/tag-picker/tag-picker.mapper';
import { StudyTagDirective } from '../../../../../shared/directives/study-tag.directive';
import { DomainEntryFooterComponent } from '../../../shared/domain-entry-footer/domain-entry-footer.component';
import { DomainSyncControlsComponent } from '../../../shared/domain-sync-controls/domain-sync-controls.component';
import { QuestionRecord } from '../../model/questions-model';

@Component({
  selector: 'app-question-entry-card',
  imports: [
    TranslocoPipe,
    DomainEntryFooterComponent,
    DomainSyncControlsComponent,
    StudyTagDirective,
  ],
  templateUrl: './question-entry-card.component.html',
  styleUrl: './question-entry-card.component.css',
})
export class QuestionEntryCardComponent {
  readonly row = input.required<QuestionRecord>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showActions = input(true);
  readonly canRetry = input(false);
  readonly pendingDeletion = input(false);
  readonly retryRequested = output<QuestionRecord>();
  readonly editRequested = output<QuestionRecord>();
  readonly deleteRequested = output<string>();
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;

  splitTags(tags: string[]): string[] {
    return parseTagsFromArray(tags);
  }
}
