import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission.service';
import { DomainEntryHeaderComponent } from '../../../shared/domain-entry-header/domain-entry-header.component';
import { DomainContributorComponent } from '../../../shared/domain-contributor/domain-contributor.component';
import { parseTags } from '../../../../../shared/utils/tag-utils';
import { StudyTagDirective } from '../../../../../shared/directives/study-tag.directive';
import { PassageReaderComponent } from '../passage-reader/passage-reader.component';
import { PassagesRow } from '../../model/domain-passage-row.model';

@Component({
  selector: 'app-passage-entry-card',
  imports: [TranslocoPipe, DomainEntryHeaderComponent, PassageReaderComponent, DomainContributorComponent, StudyTagDirective],
  templateUrl: './passage-entry-card.component.html',
  styleUrl: './passage-entry-card.component.css',
})
export class PassageEntryCardComponent {
  private readonly permissionService = inject(PermissionService);

  readonly row = input.required<PassagesRow>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showActions = input(true);
  readonly showReadAction = input(true);
  readonly showContext = input(false);
  readonly readerMode = input<'external' | 'internal'>('external');
  readonly selectedPassage = signal<PassagesRow | null>(null);
  readonly contextualBookName = computed(() => this.bookName() || this.row().book);
  readonly contextualBookAuthor = computed(() => this.bookAuthor() || this.row().author);
  readonly editRequested = output<PassagesRow>();
  readonly deleteRequested = output<string>();
  readonly readRequested = output<PassagesRow>();
  readonly role = this.permissionService.role;
  readonly permissions = this.permissionService;

  requestRead(): void {
    if (this.readerMode() === 'internal') {
      this.selectedPassage.set(this.row());
      return;
    }

    this.readRequested.emit(this.row());
  }

  estimateReadingMinutes(text: string): number {
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  }

  splitTags(tags: string[] | undefined): string[] {
    return parseTags(tags);
  }
}