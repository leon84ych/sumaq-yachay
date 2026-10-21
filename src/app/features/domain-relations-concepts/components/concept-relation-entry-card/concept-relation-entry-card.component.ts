import { Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../core/services/permission.service';
import { DomainEntryCardComponent } from '../../../../shared/domain-entry-card/domain-entry-card.component';
import { parseTags } from '../../../../shared/utils/tag-utils';
import { BookRelationConcept } from '../../model/book-relation-concept.model';

@Component({
  selector: 'app-concept-relation-entry-card',
  standalone: true,
  imports: [TranslocoPipe, DomainEntryCardComponent],
  templateUrl: './concept-relation-entry-card.component.html',
  styleUrl: './concept-relation-entry-card.component.css',
})
export class ConceptRelationEntryCardComponent {
  readonly row = input.required<BookRelationConcept>();
  readonly sourceConceptName = input.required<string>();
  readonly targetConceptName = input.required<string>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showContext = input(false);
  readonly showActions = input(true);
  readonly deleteRequested = output<string>();
  readonly editRequested = output<BookRelationConcept>();

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
