import { Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DomainName } from '../../../catalog-detail/models/domain-sheet-config';
import { StudySearchService } from '../../../../core/services/study-search.service';

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
}
