import { Type, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { AssociationEntryCardComponent } from '../../associations/components/association-entry-card/association-entry-card.component';
import { BookEventEntryCardComponent } from '../../events/components/book-event-entry-card/book-event-entry-card.component';
import { CharacterEntryCardComponent } from '../../characters/components/character-entry-card/character-entry-card.component';
import { ConceptEntryCardComponent } from '../../concepts/components/concept-entry-card/concept-entry-card.component';
import { GlossaryEntryCardComponent } from '../../glossary/components/glossary-entry-card/glossary-entry-card.component';
import { IndexEntryCardComponent } from '../../index/components/index-entry-card/index-entry-card.component';
import { PassageEntryCardComponent } from '../../passages/components/passage-entry-card/passage-entry-card.component';
import { PlaceEntryCardComponent } from '../../places/components/place-entry-card/place-entry-card.component';
import { QuestionEntryCardComponent } from '../../questions/components/question-entry-card/question-entry-card.component';
import { QuoteEntryCardComponent } from '../../quotes/components/quote-entry-card/quote-entry-card.component';
import { RelationEntryCardComponent } from '../../relations/components/relation-entry-card/relation-entry-card.component';
import { DomainEntryFooterComponent } from '../domain-entry-footer/domain-entry-footer.component';
import { DomainEntryExportService } from '../domain-entry-footer/domain-entry-export.service';
import { DomainEntryReviewService } from '../domain-entry-footer/domain-entry-review.service';
import { DomainContributorComponent } from './domain-contributor.component';
import { StudySearchService } from '../../../../core/services/search/study-search.service';

describe('DomainContributorComponent', () => {
  it.each([
    ['leon84ych@gmail.com', 'leon84ych'],
    [' leon84ych@GMAIL.COM ', 'leon84ych'],
    ['student@example.org', 'student'],
    ['leon84ych', 'leon84ych'],
    [undefined, ''],
    [null, ''],
    ['', ''],
  ])('renders contributor %s as %s', (contributor, expected) => {
    const fixture = TestBed.createComponent(DomainContributorComponent);
    fixture.componentRef.setInput('contributor', contributor);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe(expected);
    if (!expected) expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('filters by full contributor identity and preserves existing filters without duplicates', () => {
    const search = TestBed.inject(StudySearchService);
    search.query.set('#memory book:"Ulysses"');
    const fixture = TestBed.createComponent(DomainContributorComponent);
    fixture.componentRef.setInput('contributor', 'leon84ych@gmail.com');
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();
    button.click();
    fixture.detectChanges();
    expect(button.textContent?.trim()).toBe('leon84ych');
    expect(search.query()).toBe('#memory book:"Ulysses" contributor:"leon84ych@gmail.com"');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    search.query.set('');
    fixture.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('does not propagate contributor activation to parent cards', () => {
    const fixture = TestBed.createComponent(DomainContributorComponent);
    fixture.componentRef.setInput('contributor', 'leon84ych');
    fixture.detectChanges();
    const clicked = vi.fn();
    const keydown = vi.fn();
    fixture.nativeElement.addEventListener('click', clicked);
    fixture.nativeElement.addEventListener('keydown', keydown);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(clicked).not.toHaveBeenCalled();
    expect(keydown).not.toHaveBeenCalled();
  });
});

describe('Contributor card footers', () => {
  const cards: { component: Type<unknown>; inputs?: Record<string, unknown> }[] = [
    {
      component: AssociationEntryCardComponent,
      inputs: { sourceConceptName: 'First', targetConceptName: 'Second' },
    },
    {
      component: RelationEntryCardComponent,
      inputs: { sourceCharacterName: 'First', targetCharacterName: 'Second' },
    },
    { component: BookEventEntryCardComponent },
    { component: CharacterEntryCardComponent },
    { component: ConceptEntryCardComponent },
    { component: GlossaryEntryCardComponent },
    { component: IndexEntryCardComponent },
    { component: PassageEntryCardComponent },
    { component: PlaceEntryCardComponent },
    { component: QuestionEntryCardComponent },
    { component: QuoteEntryCardComponent },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: {
            availableLangs: ['en'],
            defaultLang: 'en',
            missingHandler: { logMissingKey: false },
          },
        }),
      ],
      providers: [
        {
          provide: PermissionService,
          useValue: { role: signal('admin'), validatePermission: () => true },
        },
      ],
    });
  });

  function createCard(component: Type<unknown>, inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(component);
    fixture.componentRef.setInput('row', {
      id: 'entry-1',
      term: 'Term',
      title: 'Title',
      name: 'Name',
      role: 'supporting',
      type: 'city',
      nature: 'real',
      quote: 'Quote',
      analysis: 'Analysis',
      book: 'Book',
      author: 'Author',
      passageText: 'Text to read',
      definition: 'Definition',
      description: 'Description',
      event: 'Event',
      eventOrder: 1,
      relationType: 'related',
      tags: ['#memory', '#identity'],
      chapter: 'Chapter',
      theme: 'Theme',
      subtheme: 'Subtheme',
      contributor: 'leon84ych@gmail.com',
      syncStatus: 'synced',
    });
    fixture.componentRef.setInput('showActions', false);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    return fixture;
  }

  for (const { component, inputs } of cards) {
    it(`adds live tags to the current search in ${component.name}`, () => {
      const search = TestBed.inject(StudySearchService);
      search.query.set('Book');
      const fixture = createCard(component, inputs);
      const tags: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('button.study-tag'),
      );
      expect(tags).toHaveLength(2);
      tags[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      tags[0].click();
      tags[0].click();
      fixture.detectChanges();
      expect(search.query()).toBe('Book #memory');
      expect(tags[0].getAttribute('aria-pressed')).toBe('true');
      tags[1].click();
      expect(search.query()).toBe('Book #memory #identity');
      expect(fixture.nativeElement.querySelector('.quote-card-inner.is-flipped')).toBeNull();
    });

    it(`shows attribution on read-only ${component.name} without enabling edit actions`, () => {
      const fixture = createCard(component, inputs);
      const footer: HTMLElement = fixture.nativeElement.querySelector('.domain-card-footer');
      expect(footer.querySelector('app-domain-contributor')?.textContent?.trim()).toBe('leon84ych');
      expect(footer.querySelector('.domain-edit-button, .domain-delete-button')).toBeNull();
      expect(footer.textContent).not.toContain('@gmail.com');
      expect(footer.querySelector('.domain-card-footer__export') !== null).toBe(
        component !== IndexEntryCardComponent,
      );
      const contributor: HTMLButtonElement = footer.querySelector('app-domain-contributor button')!;
      contributor.click();
      expect(TestBed.inject(StudySearchService).query()).toBe('contributor:"leon84ych@gmail.com"');
    });
  }

  for (const { component, inputs } of cards) {
    it(`orders footer actions before attribution in ${component.name}`, () => {
      const fixture = createCard(component, { ...inputs, showActions: true });
      const footer: HTMLElement = fixture.nativeElement.querySelector('.domain-card-footer');
      const deleteButton = footer.querySelector('.domain-delete-button');
      const editButton = footer.querySelector('.domain-edit-button');
      expect(footer.children[0]).toBe(deleteButton);
      expect(footer.children[1]).toBe(editButton);
      expect(footer.children[2]?.tagName).toBe('APP-DOMAIN-CONTRIBUTOR');
      expect(footer.querySelector('.domain-card-footer__export') !== null).toBe(
        component !== IndexEntryCardComponent,
      );
    });
  }

  it('exports the supplied domain entry image from the shared footer', async () => {
    const exportService = TestBed.inject(DomainEntryExportService);
    const download = vi.spyOn(exportService, 'download').mockResolvedValue();
    const fixture = TestBed.createComponent(DomainEntryFooterComponent);
    fixture.componentRef.setInput('exportData', {
      id: 'entry-1',
      domain: 'CONCEPTS',
      bookName: 'Book',
      bookAuthor: 'Author',
      title: 'Term',
      body: 'Definition',
      tags: ['#memory'],
    });
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.domain-card-footer__export',
    );
    button.click();

    expect(download).toHaveBeenCalledWith(expect.any(HTMLElement), 'learn-concepts-entry-1.jpg', {
      backgroundColor: '#1a1a1a',
    });
    await fixture.whenStable();
    expect(TestBed.inject(DomainEntryExportService).isExporting()).toBe(false);
  });

  it('locks both review actions after selection and preserves the clicked color', async () => {
    const reviewService = TestBed.inject(DomainEntryReviewService);
    const incrementReviewCount = vi
      .spyOn(reviewService, 'incrementReviewCount')
      .mockImplementation(async (entry, outcome) => {
        const nextCount = Number(entry.record[outcome] ?? 0) + 1;
        entry.record[outcome] = nextCount;
        return nextCount;
      });
    const fixture = TestBed.createComponent(DomainEntryFooterComponent);
    fixture.componentRef.setInput('reviewData', {
      domain: 'CONCEPTS',
      record: { id: 'entry-1', bookId: 'book-1' },
    });
    fixture.componentRef.setInput('exportData', {
      id: 'entry-1',
      domain: 'CONCEPTS',
      bookName: 'Book',
      bookAuthor: 'Author',
      title: 'Term',
      body: 'Definition',
      tags: [],
    });
    fixture.detectChanges();

    const footer: HTMLElement = fixture.nativeElement.querySelector('.domain-card-footer');
    const buttons: HTMLButtonElement[] = Array.from(footer.querySelectorAll('button'));
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'LEARN.MARK_FORGOTTEN',
      'LEARN.MARK_RECALLED',
      'LEARN.EXPORT_IMAGE',
    ]);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');

    buttons[0].click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
    expect(buttons[0].classList.contains('domain-card-footer__review--selected')).toBe(true);
    expect(buttons[1].classList.contains('domain-card-footer__review--selected')).toBe(false);
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(true);

    buttons[1].click();
    await fixture.whenStable();
    expect(incrementReviewCount).toHaveBeenCalledTimes(1);

    expect(incrementReviewCount).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ domain: 'CONCEPTS' }),
      'forgotten',
    );
  });

  it('places the Read Passage action in the passage tag row', () => {
    const fixture = createCard(PassageEntryCardComponent, {
      showActions: false,
      showReadAction: true,
    });
    const row: HTMLElement = fixture.nativeElement.querySelector('.passage-card__tag-actions');

    expect(row.querySelector('.passage-tags')).not.toBeNull();
    expect(row.querySelector('.read-passage-button')).not.toBeNull();
  });
});
