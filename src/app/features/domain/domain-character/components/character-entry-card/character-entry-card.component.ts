import { Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission.service';
import { parseTagsFromArray } from '../../../../../shared/utils/tag-utils';
import { StudyTagDirective } from '../../../../../shared/directives/study-tag.directive';
import { CharacterRow } from '../../models/domain-character-row.model';
import { DomainEntryCardComponent } from '../../../shared/domain-entry-card/domain-entry-card.component';
import { DomainContributorComponent } from '../../../shared/domain-contributor/domain-contributor.component';

@Component({
  selector: 'app-character-entry-card',
  imports: [TranslocoPipe, DomainEntryCardComponent, DomainContributorComponent, StudyTagDirective],
  templateUrl: './character-entry-card.component.html',
  styleUrl: './character-entry-card.component.css',
})
export class CharacterEntryCardComponent {
  private readonly permissionService = inject(PermissionService);

  readonly row = input.required<CharacterRow>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showActions = input(true);
  readonly showContext = input(false);
  readonly contextualBookName = computed(() => this.bookName() || this.rowText('book'));
  readonly contextualBookAuthor = computed(() => this.bookAuthor() || this.rowText('author'));
  readonly deleteRequested = output<string>();
  readonly editRequested = output<CharacterRow>();
  readonly role = this.permissionService.role;
  readonly permissions = this.permissionService;

  splitTags(tags: string[] | undefined): string[] {
    return parseTagsFromArray(tags);
  }

  private rowText(field: string): string {
    const value = this.row()[field];
    return typeof value === 'string' ? value : '';
  }
}
