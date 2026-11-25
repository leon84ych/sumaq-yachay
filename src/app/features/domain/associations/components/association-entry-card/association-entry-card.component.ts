import { Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission/permission.service';
import { parseTagsFromArray } from '../../../../../shared/tag-picker/tag-picker.mapper';
import { StudyTagDirective } from '../../../../../shared/directives/study-tag.directive';
import { DomainContributorComponent } from '../../../shared/domain-contributor/domain-contributor.component';
import { DomainEntryCardComponent } from '../../../shared/domain-entry-card/domain-entry-card.component';
import { AssociationRecord } from '../../model/associations-model';

@Component({
  selector: 'app-association-entry-card-1',
  imports: [TranslocoPipe, DomainEntryCardComponent, DomainContributorComponent, StudyTagDirective],
  templateUrl: './association-entry-card.component.html',
  styleUrl: './association-entry-card.component.css',
})
export class AssociationEntryCardComponent {
  readonly row = input.required<AssociationRecord>();
  readonly sourceConceptName = input.required<string>();
  readonly targetConceptName = input.required<string>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showActions = input(true);
  readonly deleteRequested = output<string>();
  readonly editRequested = output<AssociationRecord>();
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;
  readonly title = computed(
    () =>
      `${this.sourceConceptName()}${this.row().directed ? ' -> ' : ' <-> '}${this.targetConceptName()}`,
  );

  splitTags(tags: string[]): string[] {
    return parseTagsFromArray(tags);
  }
}
