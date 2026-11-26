import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission/permission.service';
import { StudyTagDirective } from '../../../../../shared/directives/study-tag.directive';
import { parseTagsFromArray } from '../../../../../shared/tag-picker/tag-picker.mapper';
import { DomainEntryHeaderComponent } from '../../../shared/domain-entry-header/domain-entry-header.component';
import { DomainEntryFooterComponent } from '../../../shared/domain-entry-footer/domain-entry-footer.component';
import { QuoteRecord } from '../../model/quotes-model';

@Component({
  selector: 'app-quote-entry-card',
  imports: [
    TranslocoPipe,
    DomainEntryHeaderComponent,
    DomainEntryFooterComponent,
    StudyTagDirective,
  ],
  templateUrl: './quote-entry-card.component.html',
  styleUrl: './quote-entry-card.component.css',
})
export class QuoteEntryCardComponent {
  private readonly permissionService = inject(PermissionService);

  readonly row = input.required<QuoteRecord>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showActions = input(true);
  readonly showFeedReview = input(false);
  readonly deleteRequested = output<string>();
  readonly editRequested = output<QuoteRecord>();
  readonly isFlipped = signal(false);
  readonly contextualBookName = computed(() => this.bookName() || this.row().book);
  readonly contextualBookAuthor = computed(() => this.bookAuthor() || this.row().author);
  readonly role = this.permissionService.role;
  readonly permissions = this.permissionService;

  toggleCard(): void {
    if (this.row().analysis) {
      this.isFlipped.update((flipped) => !flipped);
    }
  }

  onCardKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleCard();
    }
  }

  splitTags(tags: string[]): string[] {
    return parseTagsFromArray(tags);
  }
}
