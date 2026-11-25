import { Component, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission/permission.service';
import { parseTagsFromArray } from '../../../../../shared/tag-picker/tag-picker.mapper';
import { StudyTagDirective } from '../../../../../shared/directives/study-tag.directive';
import { DomainContributorComponent } from '../../../shared/domain-contributor/domain-contributor.component';
import { DomainEntryCardComponent } from '../../../shared/domain-entry-card/domain-entry-card.component';
import { GlossaryRecord } from '../../model/glossary-model';

@Component({
  selector: 'app-glossary-entry-card-1',
  imports: [TranslocoPipe, DomainEntryCardComponent, DomainContributorComponent, StudyTagDirective],
  templateUrl: './glossary-entry-card.component.html',
  styleUrl: './glossary-entry-card.component.css',
})
export class GlossaryEntryCardComponent {
  private readonly permissionService = inject(PermissionService);
  readonly row = input.required<GlossaryRecord>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showActions = input(true);
  readonly deleteRequested = output<string>();
  readonly editRequested = output<GlossaryRecord>();
  readonly role = this.permissionService.role;
  readonly permissions = this.permissionService;

  splitTags(tags: string[]): string[] {
    return parseTagsFromArray(tags);
  }
}
