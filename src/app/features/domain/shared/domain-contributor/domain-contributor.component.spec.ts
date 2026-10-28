import { Type, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionService } from '../../../../core/services/permission.service';
import { AssociationEntryCardComponent } from '../../domain-association/components/association-entry-card/association-entry-card.component';
import { BookEventEntryCardComponent } from '../../domain-book-events/components/book-event-entry-card/book-event-entry-card.component';
import { CharacterEntryCardComponent } from '../../domain-character/components/character-entry-card/character-entry-card.component';
import { ConceptEntryCardComponent } from '../../domain-concepts/components/concept-entry-card/concept-entry-card.component';
import { GlossaryEntryCardComponent } from '../../domain-glosary/components/glossary-entry-card/glossary-entry-card.component';
import { IndexEntryCardComponent } from '../../domain-index/components/index-entry-card/index-entry-card.component';
import { normalizeIndexRows } from '../../domain-index/model/index-view-row';
import { PassageEntryCardComponent } from '../../domain-passages/components/passage-entry-card/passage-entry-card.component';
import { PlaceEntryCardComponent } from '../../domain-places/components/place-entry-card/place-entry-card.component';
import { QuoteEntryCardComponent } from '../../domain-quotes/components/quote-entry-card/quote-entry-card.component';
import { RelationEntryCardComponent } from '../../domain-relations/components/relation-entry-card/relation-entry-card.component';
import { DomainContributorComponent } from './domain-contributor.component';
import { StudySearchService } from '../../../../core/services/study-search.service';

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
    { component: ConceptEntryCardComponent, inputs: { bookRow: 1 } },
    { component: GlossaryEntryCardComponent },
    { component: IndexEntryCardComponent },
    { component: PassageEntryCardComponent },
    { component: PlaceEntryCardComponent },
    { component: QuoteEntryCardComponent },
  ];

  beforeEach(() => {
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
      const contributor: HTMLButtonElement = footer.querySelector('app-domain-contributor button')!;
      contributor.click();
      expect(TestBed.inject(StudySearchService).query()).toBe('contributor:"leon84ych@gmail.com"');
    });
  }

  for (const component of [QuoteEntryCardComponent, PassageEntryCardComponent]) {
    it(`places attribution before existing left actions in ${component.name}`, () => {
      const fixture = createCard(component, { showActions: true });
      const management: HTMLElement = fixture.nativeElement.querySelector(
        '.domain-card-footer__management',
      );
      expect(management.firstElementChild?.tagName).toBe('APP-DOMAIN-CONTRIBUTOR');
      expect(
        management.querySelectorAll('.domain-edit-button, .domain-delete-button'),
      ).toHaveLength(2);
    });
  }

  it('preserves contributor metadata when normalizing Index rows', () => {
    const [row] = normalizeIndexRows([{ id: 'index-1', contributor: 'leon84ych@gmail.com' }]);
    expect(row.contributor).toBe('leon84ych@gmail.com');
  });
});
