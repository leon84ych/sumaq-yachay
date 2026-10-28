import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';
import { DomainEntryCardComponent } from './domain-entry-card.component';
import { Translation } from '@jsverse/transloco';
import { StudySearchService } from '../../../../core/services/study-search.service';

class LearnCardTestLoader implements TranslocoLoader {
  getTranslation(): Observable<Translation> {
    return of({
      DOMAINS: { DOMAINS: { CONCEPTS: 'Concepts' } },
      COMMON: { STATUS: { synced: 'Synced' } },
    });
  }
}

describe('DomainEntryCardComponent', () => {
  it('renders book context, domain, and projected entry content', async () => {
    await TestBed.configureTestingModule({
      imports: [DomainEntryCardComponent],
      providers: [
        provideTransloco({
          config: { availableLangs: ['en'], defaultLang: 'en', fallbackLang: 'en' },
          loader: LearnCardTestLoader,
        }),
      ],
    }).compileComponents();

    const fixture: ComponentFixture<DomainEntryCardComponent> =
      TestBed.createComponent(DomainEntryCardComponent);
    fixture.componentRef.setInput('domain', 'CONCEPTS');
    fixture.componentRef.setInput('bookName', 'Book One');
    fixture.componentRef.setInput('bookAuthor', 'Author One');
    fixture.componentRef.setInput('title', 'Knowledge');
    fixture.componentRef.setInput('showContext', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Book One');
    expect(fixture.nativeElement.textContent).toContain('Author One');
  });
});

describe('Domain entry header filters', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DomainEntryCardComponent],
      providers: [
        provideTransloco({
          config: { availableLangs: ['en'], defaultLang: 'en', fallbackLang: 'en' },
          loader: LearnCardTestLoader,
        }),
      ],
    });
  });

  function createCard(bookName = 'Book One', bookAuthor = 'Author One') {
    const fixture = TestBed.createComponent(DomainEntryCardComponent);
    fixture.componentRef.setInput('domain', 'CONCEPTS');
    fixture.componentRef.setInput('title', 'Knowledge');
    fixture.componentRef.setInput('bookName', bookName);
    fixture.componentRef.setInput('bookAuthor', bookAuthor);
    fixture.detectChanges();
    return fixture;
  }

  it('adds book and author filters without clearing existing text or tags', () => {
    const search = TestBed.inject(StudySearchService);
    search.query.set('knowledge #memory');
    const fixture = createCard();
    const book: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.domain-entry-header__book-filter',
    );
    const author: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.domain-entry-header__author-filter',
    );
    book.click();
    author.click();
    book.click();
    author.click();
    fixture.detectChanges();
    expect(search.query()).toBe('knowledge #memory book:"Book One" author:"Author One"');
    expect(book.getAttribute('aria-pressed')).toBe('true');
    expect(author.getAttribute('aria-pressed')).toBe('true');
    search.query.set('');
    fixture.detectChanges();
    expect(book.getAttribute('aria-pressed')).toBe('false');
    expect(author.getAttribute('aria-pressed')).toBe('false');
  });

  it('stops filter activation events from reaching a parent card', () => {
    const fixture = createCard();
    const clicked = vi.fn();
    const keydown = vi.fn();
    fixture.nativeElement.addEventListener('click', clicked);
    fixture.nativeElement.addEventListener('keydown', keydown);
    const book: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.domain-entry-header__book-filter',
    );
    book.click();
    book.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    book.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(clicked).not.toHaveBeenCalled();
    expect(keydown).not.toHaveBeenCalled();
  });

  it('does not render empty context buttons or a leading separator for author-only entries', () => {
    const fixture = createCard('', 'Author One');
    expect(fixture.nativeElement.querySelector('.domain-entry-header__book-filter')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.domain-entry-header__author-filter').textContent.trim(),
    ).toBe('Author One');
    expect(
      fixture.nativeElement.querySelector('.domain-entry-header__book').textContent,
    ).not.toContain('·');
  });

  it('keeps context filters hidden when only the status is shown', () => {
    const fixture = createCard();
    fixture.componentRef.setInput('showContext', false);
    fixture.componentRef.setInput('status', 'synced');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.status-indicator')).not.toBeNull();
  });
});
