import { Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission/permission.service';
import { parseTagsFromArray } from '../../../../../shared/tag-picker/tag-picker.mapper';
import { StudyTagDirective } from '../../../../../shared/directives/study-tag.directive';
import { DomainEntryCardComponent } from '../../../shared/domain-entry-card/domain-entry-card.component';
import { DomainEntryFooterComponent } from '../../../shared/domain-entry-footer/domain-entry-footer.component';
import { DomainSyncControlsComponent } from '../../../shared/domain-sync-controls/domain-sync-controls.component';
import { RelationRecord } from '../../model/relations-model';

@Component({
  selector: 'app-relation-entry-card',
  imports: [
    TranslocoPipe,
    DomainEntryCardComponent,
    DomainEntryFooterComponent,
    DomainSyncControlsComponent,
    StudyTagDirective,
  ],
  templateUrl: './relation-entry-card.component.html',
  styleUrl: './relation-entry-card.component.css',
})
export class RelationEntryCardComponent {
  readonly row = input.required<RelationRecord>();
  readonly sourceCharacterName = input.required<string>();
  readonly targetCharacterName = input.required<string>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showActions = input(true);
  readonly canRetry = input(false);
  readonly pendingDeletion = input(false);
  readonly retryRequested = output<RelationRecord>();
  readonly deleteRequested = output<string>();
  readonly editRequested = output<RelationRecord>();
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;
  readonly title = computed(
    () =>
      `${this.sourceCharacterName()}${this.row().directed ? ' -> ' : ' <-> '}${this.targetCharacterName()}`,
  );

  splitTags(tags: string[]): string[] {
    return parseTagsFromArray(tags);
  }
}
