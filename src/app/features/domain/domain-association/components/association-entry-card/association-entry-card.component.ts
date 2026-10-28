import { Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission.service';
import { DomainEntryCardComponent } from '../../../shared/domain-entry-card/domain-entry-card.component';
import { DomainContributorComponent } from '../../../shared/domain-contributor/domain-contributor.component';
import { parseTags } from '../../../../../shared/utils/tag-utils';
import { StudyTagDirective } from '../../../../../shared/directives/study-tag.directive';
import { BookAssociation } from '../../model/book-association.model';

@Component({
  selector: 'app-association-entry-card',
  standalone: true,
  imports: [TranslocoPipe, DomainEntryCardComponent, DomainContributorComponent, StudyTagDirective],
  templateUrl: './association-entry-card.component.html',
  styleUrl: './association-entry-card.component.css',
})
export class AssociationEntryCardComponent {
  readonly row = input.required<BookAssociation>();
  readonly sourceConceptName = input.required<string>();
  readonly targetConceptName = input.required<string>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showContext = input(false);
  readonly showActions = input(true);
  readonly deleteRequested = output<string>();
  readonly editRequested = output<BookAssociation>();

  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;
  readonly title = computed(
    () =>
      `${this.sourceConceptName()}${this.row().directed ? ' -> ' : ' <-> '}${this.targetConceptName()}`,
  );

  splitTags(tags: string[]): string[] {
    return parseTags(tags);
  }
}
