import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission/permission.service';
import { StudyTagDirective } from '../../../../../shared/directives/study-tag.directive';
import { parseTagsFromArray } from '../../../../../shared/tag-picker/tag-picker.mapper';
import { DomainContributorComponent } from '../../../shared/domain-contributor/domain-contributor.component';
import { DomainEntryHeaderComponent } from '../../../shared/domain-entry-header/domain-entry-header.component';
import { PassageRecord } from '../../model/passages-model';
import { PassageReaderComponent } from '../passage-reader/passage-reader.component';

@Component({
  selector: 'app-passage-entry-card-1',
  imports: [
    TranslocoPipe,
    DomainEntryHeaderComponent,
    PassageReaderComponent,
    DomainContributorComponent,
    StudyTagDirective,
  ],
  templateUrl: './passage-entry-card.component.html',
  styleUrl: './passage-entry-card.component.css',
})
export class PassageEntryCardComponent {
  private readonly permissionService = inject(PermissionService);

  readonly row = input.required<PassageRecord>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showActions = input(true);
  readonly showReadAction = input(true);
  readonly showContext = input(false);
  readonly readerMode = input<'external' | 'internal'>('external');
  readonly selectedPassage = signal<PassageRecord | null>(null);
  readonly contextualBookName = computed(() => this.bookName() || this.row().book);
  readonly contextualBookAuthor = computed(() => this.bookAuthor() || this.row().author);
  readonly readingMinutes = computed(() => {
    const wordCount = this.row().passageText.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  });
  readonly editRequested = output<PassageRecord>();
  readonly deleteRequested = output<string>();
  readonly readRequested = output<PassageRecord>();
  readonly role = this.permissionService.role;
  readonly permissions = this.permissionService;

  requestRead(): void {
    if (this.readerMode() === 'internal') {
      this.selectedPassage.set(this.row());
      return;
    }

    this.readRequested.emit(this.row());
  }

  splitTags(tags: string[]): string[] {
    return parseTagsFromArray(tags);
  }
}
