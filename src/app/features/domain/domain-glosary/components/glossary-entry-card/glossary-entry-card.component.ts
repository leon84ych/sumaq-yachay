import { Component, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission.service';
import { DomainEntryCardComponent } from '../../../shared/domain-entry-card/domain-entry-card.component';
import { DomainContributorComponent } from '../../../shared/domain-contributor/domain-contributor.component';
import { parseTags } from '../../../../../shared/utils/tag-utils';
import { StudyTagDirective } from '../../../../../shared/directives/study-tag.directive';
import { GlossaryRow } from '../../model/domain-glosary-row.model';

@Component({
  selector: 'app-glossary-entry-card',
  imports: [TranslocoPipe, DomainEntryCardComponent, DomainContributorComponent, StudyTagDirective],
  templateUrl: './glossary-entry-card.component.html',
  styleUrl: './glossary-entry-card.component.css',
})
export class GlossaryEntryCardComponent {
  private readonly permissionService = inject(PermissionService);

  readonly row = input.required<GlossaryRow>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showActions = input(true);
  readonly showContext = input(false);
  readonly deleteRequested = output<string>();
  readonly editRequested = output<GlossaryRow>();
  readonly role = this.permissionService.role;
  readonly permissions = this.permissionService;

  splitTags(tags: string[] | undefined): string[] {
    return parseTags(tags);
  }
}