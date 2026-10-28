import { Component, computed, inject, input } from '@angular/core';
import { StudySearchService } from '../../../../core/services/study-search.service';

@Component({
  selector: 'app-domain-contributor',
  template: `
    @if (username()) {
      <button
        type="button"
        [attr.aria-pressed]="selected()"
        (click)="filterBy($event)"
        (keydown)="onFilterKeydown($event)"
      >
        {{ username() }}
      </button>
    }
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
      max-width: 100%;
      color: var(--text-muted);
      font-size: 0.75rem;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
    :host:empty {
      display: none;
    }
    button {
      max-width: 100%;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: inherit;
      overflow-wrap: anywhere;
      cursor: pointer;
    }
    button:hover,
    button[aria-pressed='true'] {
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }
    button:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 3px;
    }
  `,
})
export class DomainContributorComponent {
  private readonly search = inject(StudySearchService);
  readonly contributor = input<unknown>('');
  readonly username = computed(() => {
    const contributor = this.contributor();
    return typeof contributor === 'string' ? contributor.trim().split('@')[0] : '';
  });
  readonly selected = computed(() => {
    const contributor = this.contributor();
    return typeof contributor === 'string' && this.search.hasText(contributor, 'contributor');
  });

  filterBy(event: Event): void {
    event.stopPropagation();
    const contributor = this.contributor();
    if (typeof contributor === 'string') this.search.addText(contributor, 'contributor');
  }

  onFilterKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
  }
}
