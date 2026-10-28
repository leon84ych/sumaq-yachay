import { Component, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission.service';
import { DomainEntryHeaderComponent } from '../../../shared/domain-entry-header/domain-entry-header.component';
import { DomainContributorComponent } from '../../../shared/domain-contributor/domain-contributor.component';
import { parseTags } from '../../../../../shared/utils/tag-utils';
import { StudyTagDirective } from '../../../../../shared/directives/study-tag.directive';
import { IndexViewRow } from '../../model/index-view-row';

@Component({
  selector: 'app-index-entry-card',
  imports: [TranslocoPipe, DomainEntryHeaderComponent, DomainContributorComponent, StudyTagDirective],
  templateUrl: './index-entry-card.component.html',
  styleUrl: './index-entry-card.component.css',
})
export class IndexEntryCardComponent {
  private readonly permissionService = inject(PermissionService);

  readonly row = input.required<IndexViewRow>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showActions = input(true);
  readonly showContext = input(false);
  readonly showHierarchy = input(true);
  readonly editRequested = output<IndexViewRow>();
  readonly deleteRequested = output<string>();
  readonly role = this.permissionService.role;
  readonly permissions = this.permissionService;

  splitTags(value: string[]): string[] {
    return parseTags(value);
  }
}