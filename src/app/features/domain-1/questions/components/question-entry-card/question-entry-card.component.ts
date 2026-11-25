import { Component, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission/permission.service';
import { parseTagsFromArray } from '../../../../../shared/tag-picker/tag-picker.mapper';
import { StudyTagDirective } from '../../../../../shared/directives/study-tag.directive';
import { DomainContributorComponent } from '../../../shared/domain-contributor/domain-contributor.component';
import { QuestionRecord } from '../../model/questions-model';

@Component({
  selector: 'app-question-entry-card-1',
  imports: [TranslocoPipe, DomainContributorComponent, StudyTagDirective],
  templateUrl: './question-entry-card.component.html',
  styleUrl: './question-entry-card.component.css',
})
export class QuestionEntryCardComponent {
  readonly row = input.required<QuestionRecord>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly editRequested = output<QuestionRecord>();
  readonly deleteRequested = output<string>();
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;

  splitTags(tags: string[]): string[] {
    return parseTagsFromArray(tags);
  }
}
