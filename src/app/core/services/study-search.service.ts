import { Injectable, signal } from '@angular/core';
import { normalizeTags } from '../../shared/utils/tag-utils';
import { parseStudySearch, StudySearchField } from '../../shared/utils/study-search';

@Injectable({ providedIn: 'root' })
export class StudySearchService {
  readonly query = signal('');

  hasText(text: string, field?: StudySearchField): boolean {
    const parsed = parseStudySearch(`${field ? `${field}:` : ''}${JSON.stringify(text.trim())}`);
    const phrase = field ? parsed.contexts?.[0]?.value : parsed.phrases?.[0];
    if (!phrase) return false;
    const search = parseStudySearch(this.query());
    if (field)
      return (search.contexts ?? []).some(
        (context) => context.field === field && context.value === phrase,
      );
    return search.text === phrase || (search.phrases ?? []).includes(phrase);
  }

  addText(text: string, field?: StudySearchField): void {
    const phrase = text.trim();
    if (!phrase || this.hasText(phrase, field)) return;
    const filter = `${field ? `${field}:` : ''}${JSON.stringify(phrase)}`;
    this.query.update((query) => [query.trim(), filter].filter(Boolean).join(' '));
  }

  addTag(tag: string): void {
    const candidates = normalizeTags([tag]);
    this.query.update((query) => {
      const selected = new Set(parseStudySearch(query).tags);
      const additions = candidates.filter(
        (candidate) => !selected.has(parseStudySearch(candidate).tags[0]),
      );
      return additions.length ? [query.trim(), ...additions].filter(Boolean).join(' ') : query;
    });
  }
}
