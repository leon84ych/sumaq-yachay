import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../core/services/permission.service';
import { PassageReaderComponent } from '../passage-reader/passage-reader.component';
import { PassagesRow } from '../../model/domain-passage-row.model';

@Component({
  selector: 'app-passage-entry-card',
  imports: [TranslocoPipe, PassageReaderComponent],
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

  splitTags(tags: string | undefined): string[] {
    return (tags ?? '')
      .split(/[\s,;]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
}