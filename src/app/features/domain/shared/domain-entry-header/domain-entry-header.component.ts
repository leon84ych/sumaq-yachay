import { Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DomainName } from '../../book-detail/models/domain-sheet-config';
import { StudySearchService } from '../../../../core/services/search/study-search.service';

@Component({
  selector: 'app-domain-entry-header',
  imports: [TranslocoPipe],
  templateUrl: './domain-entry-header.component.html',
  styleUrl: './domain-entry-header.component.css',
})
export class DomainEntryHeaderComponent {
  private readonly studySearch = inject(StudySearchService);
  readonly domain = input.required<DomainName>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly status = input<string | null>(null);
  readonly retryable = input(false);
  readonly retryLabelKey = input('COMMON.RETRY_SYNC');
  readonly retryRequested = output<void>();
  readonly showContext = input(true);
  readonly compact = input(false);
  readonly useProjectedLabel = input(false);
  readonly bookSelected = computed(() => this.studySearch.hasText(this.bookName(), 'book'));
  readonly authorSelected = computed(() => this.studySearch.hasText(this.bookAuthor(), 'author'));

  filterBy(event: Event, value: string, field: 'book' | 'author'): void {
    event.stopPropagation();
    this.studySearch.addText(value, field);
  }

  onFilterKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
  }

  retry(event: Event): void {
    event.stopPropagation();
    this.retryRequested.emit();
  }
}
