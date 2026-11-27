import { Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission/permission.service';
import { parseTagsFromArray } from '../../../../../shared/tag-picker/tag-picker.mapper';
import { StudyTagDirective } from '../../../../../shared/directives/study-tag.directive';
import { DomainEntryCardComponent } from '../../../shared/domain-entry-card/domain-entry-card.component';
import { DomainEntryFooterComponent } from '../../../shared/domain-entry-footer/domain-entry-footer.component';
import { DomainSyncControlsComponent } from '../../../shared/domain-sync-controls/domain-sync-controls.component';
import { CharacterRecord } from '../../model/characters-model';

@Component({
  selector: 'app-character-entry-card',
  imports: [
    TranslocoPipe,
    DomainEntryCardComponent,
    DomainEntryFooterComponent,
    DomainSyncControlsComponent,
    StudyTagDirective,
  ],
  templateUrl: './character-entry-card.component.html',
  styleUrl: './character-entry-card.component.css',
})
export class CharacterEntryCardComponent {
  private readonly permissionService = inject(PermissionService);
  readonly row = input.required<CharacterRecord>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showActions = input(true);
  readonly canRetry = input(false);
  readonly pendingDeletion = input(false);
  readonly retryRequested = output<CharacterRecord>();
  readonly showFeedReview = input(false);
  readonly contextualBookName = computed(() => this.bookName());
  readonly contextualBookAuthor = computed(() => this.bookAuthor());
  readonly deleteRequested = output<string>();
  readonly editRequested = output<CharacterRecord>();
  readonly role = this.permissionService.role;
  readonly permissions = this.permissionService;

  splitTags(tags: string[]): string[] {
    return parseTagsFromArray(tags);
  }
}
