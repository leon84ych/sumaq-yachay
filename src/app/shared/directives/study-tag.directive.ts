import { Directive, computed, inject, input } from '@angular/core';
import { StudySearchService } from '../../core/services/study-search.service';
import { parseStudySearch } from '../utils/study-search';
import { normalizeTags } from '../utils/tag-utils';

@Directive({
  selector: 'button[appStudyTag]',
  host: {
    class: 'study-tag',
    '[attr.aria-pressed]': 'selected()',
    '(click)': 'select($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class StudyTagDirective {
  readonly tag = input.required<string>({ alias: 'appStudyTag' });
  private readonly search = inject(StudySearchService);
  readonly selected = computed(() =>
    parseStudySearch(this.search.query()).tags.includes(
      parseStudySearch(normalizeTags([this.tag()]).join(' ')).tags[0],
    ),
  );

  select(event: Event): void {
    event.stopPropagation();
    this.search.addTag(this.tag());
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
  }
}
