import { Component, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission/permission.service';

import { parseTagsFromArray } from '../../../../../shared/utils/tag-utils';
import { StudyTagDirective } from '../../../../../shared/directives/study-tag.directive';
import { IndexRecord } from '../../model/index-model';
import { DomainEntryHeaderComponent } from '../../../../domain/shared/domain-entry-header/domain-entry-header.component';
import { DomainContributorComponent } from '../../../../domain/shared/domain-contributor/domain-contributor.component';

@Component({
  selector: 'app-index-entry-card-1',
  imports: [TranslocoPipe, DomainEntryHeaderComponent, DomainContributorComponent, StudyTagDirective],
  templateUrl: './index-entry-card.component.html',
  styleUrl: './index-entry-card.component.css',
})
export class IndexEntryCardComponent {
  private readonly permissionService = inject(PermissionService);

  readonly row = input.required<IndexRecord>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showActions = input(true);
  readonly showContext = input(false);
  readonly showHierarchy = input(true);
  readonly editRequested = output<IndexRecord>();
  readonly deleteRequested = output<string>();
  readonly role = this.permissionService.role;
  readonly permissions = this.permissionService;

  splitTags(value: string[]): string[] {
    return parseTagsFromArray(value);
  }
}