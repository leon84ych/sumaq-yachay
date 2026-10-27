import { Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission.service';
import { DomainEntryCardComponent } from '../../../shared/domain-entry-card/domain-entry-card.component';
import { parseTags } from '../../../../../shared/utils/tag-utils';
import { BookRelation } from '../../model/book-relation.model';

@Component({
  selector: 'app-relation-entry-card',
  standalone: true,
  imports: [TranslocoPipe, DomainEntryCardComponent],
  templateUrl: './relation-entry-card.component.html',
  styleUrl: './relation-entry-card.component.css',
})
export class RelationEntryCardComponent {
  readonly row = input.required<BookRelation>();
  readonly sourceCharacterName = input.required<string>();
  readonly targetCharacterName = input.required<string>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showContext = input(false);
  readonly showActions = input(true);
  readonly deleteRequested = output<string>();
  readonly editRequested = output<BookRelation>();

  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;
  readonly title = computed(
    () =>
      `${this.sourceCharacterName()}${this.row().directed ? ' -> ' : ' <-> '}${this.targetCharacterName()}`,
  );

  splitTags(tags: string[]): string[] {
    return parseTags(tags);
  }
}
