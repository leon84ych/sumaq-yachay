import { Injector, Signal, Type, WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslocoService } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookGASRepository } from '../../../features/catalog/book/services/book-gas-repository';
import { BookService } from '../../../features/catalog/book/services/book.service';
import { GoogleAuthService } from '../../../features/authentication/services/google-auth-service';
import { AssociationsComponent } from '../../../features/domain/associations/associations/associations.component';
import { BookEventsComponent } from '../../../features/domain/events/events/book-events.component';
import { CharactersComponent } from '../../../features/domain/characters/characters/characters.component';
import { ConceptsComponent } from '../../../features/domain/concepts/concepts/concepts.component';
import { GlossaryComponent } from '../../../features/domain/glossary/glossary/glossary.component';
import { PassagesComponent } from '../../../features/domain/passages/passages/passages.component';
import { PlacesComponent } from '../../../features/domain/places/places/places.component';
import { QuestionsComponent } from '../../../features/domain/questions/questions/questions.component';
import { QuestionPracticeComponent } from '../../../features/quiz/question-practice/question-practice.component';
import { QuestionAttemptService } from '../../../features/domain/questions/services/question-attempt.service';
import { QuestionPracticeService } from '../../../features/domain/questions/services/question-practice.service';
import { QuotesComponent } from '../../../features/domain/quotes/quotes/quotes.component';
import { RelationsComponent } from '../../../features/domain/relations/relations/relations.component';
import { AllDomainWriteSyncService } from '../../../features/domain/shared/domain-repository/all-domain-write-sync.service';
import { IndexComponent } from '../../../features/domain/index/index/index.component';
import { Learn } from '../../../features/learn/learn/learn.component';
import { LearnFeedService } from '../../../features/learn/services/learn-feed.service';
import { LocalDBService } from '../../../shared/local-db/local-db.service';
import { ConfigService } from '../config/config.service';
import { PermissionService } from '../permission/permission.service';
import { StudySearchService } from './study-search.service';
import { matchesStudySearch, parseStudySearch } from '../../../shared/utils/study-search';

interface DomainSearchView {
  searchTerm: WritableSignal<string>;
  filteredRows: Signal<unknown[]>;
  rows: WritableSignal<never[]>;
  bookName: WritableSignal<string>;
  bookAuthor: WritableSignal<string>;
}

const domainViews: { component: Type<DomainSearchView>; domain: string }[] = [
  { component: IndexComponent as unknown as Type<DomainSearchView>, domain: 'index' },
  { component: QuestionsComponent as unknown as Type<DomainSearchView>, domain: 'questions' },
  { component: ConceptsComponent as unknown as Type<DomainSearchView>, domain: 'concepts' },
  { component: CharactersComponent as unknown as Type<DomainSearchView>, domain: 'characters' },
  { component: GlossaryComponent as unknown as Type<DomainSearchView>, domain: 'glossary' },
  { component: PassagesComponent as unknown as Type<DomainSearchView>, domain: 'passages' },
  { component: PlacesComponent as unknown as Type<DomainSearchView>, domain: 'places' },
  { component: QuotesComponent as unknown as Type<DomainSearchView>, domain: 'quotes' },
  { component: BookEventsComponent as unknown as Type<DomainSearchView>, domain: 'book events' },
  { component: AssociationsComponent as unknown as Type<DomainSearchView>, domain: 'associations' },
  { component: RelationsComponent as unknown as Type<DomainSearchView>, domain: 'relations' },
];

describe('StudySearchService', () => {
  const loadLearnBatch = vi.fn();
  const loadQuestionBatch = vi.fn();
  let relatedRows: Record<string, unknown>[];

  beforeEach(() => {
    relatedRows = [];
    loadLearnBatch.mockReset().mockResolvedValue([]);
    loadQuestionBatch.mockReset().mockResolvedValue([]);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: LearnFeedService, useValue: { loadRandomBatch: loadLearnBatch, canFetchRemote: () => false } },
        { provide: QuestionPracticeService, useValue: {
          loadRandomBatch: loadQuestionBatch, optionsFor: () => [],
        } },
        { provide: QuestionAttemptService, useValue: {} },
        { provide: AllDomainWriteSyncService, useValue: {} },
        { provide: TranslocoService, useValue: { translate: (key: string) => key } },
        { provide: PermissionService, useValue: {
          role: signal('admin'), validatePermission: () => true,
        } },
        { provide: ConfigService, useValue: {
          isLocalSampleDataEnabled: () => false, localSampleDataEnabled: signal(false),
          getFeedMaxIntervalDays: () => 32,
        } },
        { provide: LocalDBService, useValue: {
          indexedDB: {
            books: { toArray: async () => [] },
            tables: [{ name: 'concepts', toArray: async () => relatedRows }],
          },
        } },
        { provide: BookGASRepository, useValue: {} },
        { provide: GoogleAuthService, useValue: { idToken: signal(null) } },
      ],
    });
    for (const component of [Learn, QuestionPracticeComponent, ...domainViews.map((view) => view.component)]) {
      TestBed.overrideComponent(component, { set: { template: '', imports: [] } });
    }
  });

  afterEach(() => vi.useRealTimers());

  it('shares the keyword across view injectors and clears it everywhere', () => {
    const parent = TestBed.inject(Injector);
    const book = Injector.create({ providers: [], parent }).get(StudySearchService);
    const learn = Injector.create({ providers: [], parent }).get(StudySearchService);
    const questions = Injector.create({ providers: [], parent }).get(StudySearchService);

    expect(book.query()).toBe('');
    book.query.set('Kafka');
    expect(learn.query()).toBe('Kafka');
    expect(questions.query()).toBe('Kafka');
    questions.query.set('architecture');
    expect(book.query()).toBe('architecture');
    learn.query.set('');
    expect(book.query()).toBe('');
    expect(questions.query()).toBe('');
  });

  it('uses the shared keyword to filter book book names, authors, and topics', async () => {
    const book = TestBed.inject(BookService);
    await book.loadFromLocal();
    const entry = {
      id: 'book-1', row: 1, name: 'Book One', author: 'Author One', subject: 'Science',
      topic: 'Physics', active: true, count: 1, updatedAt: '', isbn: '', language: 'en', page: 0, pages: 0,
    };
    book.items.set([entry]);
    const search = TestBed.inject(StudySearchService);
    for (const query of ['Book One', 'Author One', 'Physics', 'book:"Book One"', 'author:"Author One"']) {
      search.query.set(query);
      expect(book.filteredItems()).toEqual([entry]);
    }
    search.query.set('not present');
    expect(book.filteredItems()).toEqual([]);
    search.query.set('');
    expect(book.filteredItems()).toEqual([entry]);
  });

  it('appends clicked tags without replacing the phrase or duplicating existing tags', () => {
    const search = TestBed.inject(StudySearchService);
    search.query.set('James Joyce');
    search.addTag('#Memory');
    search.addTag('#memory');
    search.addTag('#identity');
    expect(search.query()).toBe('James Joyce #memory #identity');
    expect(parseStudySearch(search.query())).toEqual({
      text: 'james joyce', tags: ['#memory', '#identity'],
    });
  });

  it('adds book and author phrases while preserving text and tags without duplicates', () => {
    const search = TestBed.inject(StudySearchService);
    search.query.set('James Joyce #memory');
    search.addText('James Joyce');
    search.addText('Ulysses');
    search.addText('ulysses');
    search.addText('');
    expect(search.query()).toBe('James Joyce #memory "Ulysses"');
    expect(search.hasText('James Joyce')).toBe(true);
    expect(search.hasText('Ulysses')).toBe(true);
    expect(matchesStudySearch(search.query(), ['James Joyce', 'Ulysses'], ['#memory'])).toBe(true);
    expect(matchesStudySearch(search.query(), ['James Joyce', 'Other Book'], ['#memory'])).toBe(false);
    expect(matchesStudySearch(search.query(), ['Other Author', 'Ulysses'], ['#memory'])).toBe(false);
    expect(matchesStudySearch(search.query(), ['James Joyce', 'Ulysses'], [])).toBe(false);
  });

  it('adds author and book filters from an empty search and keeps punctuation inside titles', () => {
    const search = TestBed.inject(StudySearchService);
    search.addText('Author One');
    search.addText('Book #1: "Memory"');
    search.addTag('#identity');
    expect(parseStudySearch(search.query())).toEqual({
      text: '', phrases: ['author one', 'book #1: "memory"'], tags: ['#identity'],
    });
    expect(matchesStudySearch(search.query(), ['Author One', 'Book #1: "Memory"'], ['#identity']))
      .toBe(true);
    expect(search.hasText('Book #1: "Memory"')).toBe(true);
    search.query.set('');
    expect(search.hasText('Author One')).toBe(false);
  });

  it('scopes header filters to the book and author instead of matching mentions in the body', () => {
    const search = TestBed.inject(StudySearchService);
    search.query.set('#memory');
    search.addText('Ulysses', 'book');
    search.addText('James Joyce', 'author');
    search.addText('ulysses', 'book');
    expect(search.query()).toBe('#memory book:"Ulysses" author:"James Joyce"');
    expect(search.hasText('James Joyce', 'author')).toBe(true);
    const fields = ['Ulysses is a book by James Joyce'];
    expect(matchesStudySearch(search.query(), fields, ['#memory'],
      { book: 'Ulysses', author: 'James Joyce' })).toBe(true);
    expect(matchesStudySearch(search.query(), fields, ['#memory'],
      { book: 'Other Book', author: 'James Joyce' })).toBe(false);
    expect(matchesStudySearch(search.query(), fields, ['#memory'],
      { book: 'Ulysses', author: 'Other Author' })).toBe(false);
  });

  it('adds an exact contributor filter while preserving all current study filters', () => {
    const search = TestBed.inject(StudySearchService);
    search.query.set('#memory book:"Ulysses" author:"James Joyce"');
    search.addText('leon84ych@gmail.com', 'contributor');
    search.addText('LEON84YCH@gmail.com', 'contributor');
    expect(search.query()).toBe('#memory book:"Ulysses" author:"James Joyce" contributor:"leon84ych@gmail.com"');
    expect(search.hasText('leon84ych@gmail.com', 'contributor')).toBe(true);
    const context = { book: 'Ulysses', author: 'James Joyce', contributor: 'leon84ych@gmail.com' };
    expect(matchesStudySearch(search.query(), [], ['#memory'], context)).toBe(true);
    expect(matchesStudySearch(search.query(), ['leon84ych@gmail.com'], ['#memory'],
      { ...context, contributor: 'other@gmail.com' })).toBe(false);
    expect(matchesStudySearch(search.query(), [], ['#memory'],
      { ...context, contributor: 'leon84ych@example.org' })).toBe(false);
    expect(matchesStudySearch(search.query(), [], ['#memory'],
      { book: 'Ulysses', author: 'James Joyce' })).toBe(false);
    expect(matchesStudySearch('leon84ych', [], [], context)).toBe(true);
  });

  it('requires the text and all exact tags, allowing book or author context in another field', () => {
    expect(matchesStudySearch('James Joyce #memory', ['Ulysses', 'James Joyce'], ['#memory']))
      .toBe(true);
    expect(matchesStudySearch('James Joyce #memory', ['Other Author'], ['#memory'])).toBe(false);
    expect(matchesStudySearch('James Joyce #memory', ['James Joyce'], ['#memory-loss'])).toBe(false);
    expect(matchesStudySearch('#memory #identity', [], ['#memory'])).toBe(false);
    expect(matchesStudySearch('#memory #identity', [], ['#memory', '#identity'])).toBe(true);
    expect(matchesStudySearch('', [], [])).toBe(true);
  });

  it('filters actual Learn and Quiz batches by author and all clicked tags before pagination', async () => {
    const books = [
      { id: 'one', row: 1, name: 'Book One', author: 'Author One' },
      { id: 'two', row: 2, name: 'Book Two', author: 'Author Two' },
    ];
    const concepts = [
      { id: 'matching', bookId: 'one', bookRow: 1, term: 'Memory', tags: ['#memory', '#identity'] },
      { id: 'prefix-only', bookId: 'one', bookRow: 1, term: 'Memory loss', tags: ['#memory-loss', '#identity'] },
      { id: 'other-author', bookId: 'two', bookRow: 2, term: 'Memory', tags: ['#memory', '#identity'] },
    ].map((row) => ({ ...row, contributor: 'leon84ych@gmail.com' }));
    concepts.push({
      id: 'other-contributor', bookId: 'one', bookRow: 1, term: 'Memory', tags: ['#memory', '#identity'],
      contributor: 'other@gmail.com',
    });
    const questions = concepts.map((row) => ({
      ...row, question: row.term, answer: 'Answer', sourceDomain: 'CONCEPTS', type: 'open',
    }));
    const emptyTable = { toArray: async () => [] };
    Object.assign(TestBed.inject(LocalDBService).indexedDB, {
      books: { toArray: async () => books },
      concepts: { toArray: async () => concepts },
      questions: { toArray: async () => questions },
      quotes: emptyTable, passages: emptyTable, characters: emptyTable, places: emptyTable,
      indexes: emptyTable, bookEvents: emptyTable, relations: emptyTable,
      associations: emptyTable, glossary: emptyTable,
    });
    const feed = TestBed.runInInjectionContext(() => new LearnFeedService());
    const practice = TestBed.runInInjectionContext(() => new QuestionPracticeService());
    const query = 'book:"Book One" author:"Author One" #memory #identity contributor:"leon84ych@gmail.com"';
    const entries = await feed.loadRandomBatch(new Set(), 20, query);
    const batch = await practice.loadRandomBatch({ query });
    expect(entries).toHaveLength(1);
    expect(entries[0].domain).toBe('CONCEPTS');
    expect(entries.every((entry) => entry.bookAuthor === 'Author One')).toBe(true);
    expect(entries.every((entry) => entry.sourceRow['id'] === 'matching')).toBe(true);
    expect(batch.map((entry) => entry.id)).toEqual(['matching']);
    expect(await feed.loadRandomBatch(new Set(), 20, `${query} #missing`)).toEqual([]);
    expect(await practice.loadRandomBatch({ query: `${query} #missing` })).toEqual([]);
  });

  it('finds book books through tags and domains in locally stored learning content', async () => {
    vi.useFakeTimers();
    const book = TestBed.inject(BookService);
    TestBed.tick();
    await Promise.resolve();
    await book.loadFromLocal();
    book.items.set([
      { id: 'one', row: 1, name: 'Book One', author: 'Author', subject: 'Science',
        topic: 'Physics', active: true, count: 1, updatedAt: '', isbn: '', language: 'en', page: 0, pages: 0 },
      { id: 'two', row: 2, name: 'Book Two', author: 'Author', subject: 'Science',
        topic: 'Biology', active: true, count: 1, updatedAt: '', isbn: '', language: 'en', page: 0, pages: 0 },
    ]);
    relatedRows = [{ id: 'concept', bookId: 'one', bookRow: 1, term: 'Entropy', tags: ['#study-tag'], contributor: 'leon84ych@gmail.com' }];
    const search = TestBed.inject(StudySearchService);
    for (const query of ['study-tag', 'concepts', 'Author #study-tag', 'Book One #study-tag',
      'book:"Book One" author:"Author" #study-tag',
      'book:"Book One" author:"Author" #study-tag contributor:"leon84ych@gmail.com"']) {
      search.query.set(query);
      TestBed.tick();
      await vi.advanceTimersByTimeAsync(250);
      expect(book.filteredItems().map((entry) => entry.id)).toEqual(['one']);
    }
    relatedRows.push({ id: 'other-concept', bookId: 'two', bookRow: 2, term: 'Entropy', tags: ['#study-tag'],
      contributor: 'other@gmail.com' });
    for (const [contributor, expectedId] of [['leon84ych@gmail.com', 'one'], ['other@gmail.com', 'two']]) {
      search.query.set(`contributor:${JSON.stringify(contributor)}`);
      TestBed.tick();
      await vi.advanceTimersByTimeAsync(250);
      expect(book.filteredItems().map((entry) => entry.id)).toEqual([expectedId]);
    }
    search.query.set('unknown-tag');
    expect(book.filteredItems()).toEqual([]);
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(250);
    expect(book.filteredItems()).toEqual([]);
  });

  for (const { component, domain } of domainViews) {
    it(`filters ${domain} by shared book, author, domain, and tag, and supports clearing`, () => {
      const fixture = TestBed.createComponent(component);
      const row = {
        id: 'entry-1', name: 'Entry', term: 'Entry', question: 'Entry', answer: 'Answer',
        quote: 'Entry', analysis: '', role: 'supporting', title: 'Entry', passageText: 'Text',
        definition: 'Text', sourceDomain: 'MANUAL', book: '', author: '', page: '',
        tags: ['#study-tag'], event: 'Entry', description: 'Text', eventOrder: 1,
        dateTimeStart: '', mainCharacterId: 'main', secondaryCharacterIds: [],
        sourceConceptId: 'source', targetConceptId: 'target', sourceCharacterId: 'source',
        targetCharacterId: 'target', relationType: 'related',
        contributor: 'leon84ych@gmail.com',
      };
      fixture.componentInstance.rows.set([row] as never[]);
      fixture.componentInstance.bookName.set('Book One');
      fixture.componentInstance.bookAuthor.set('Author One');
      const search = TestBed.inject(StudySearchService);
      for (const query of ['Book One', 'Author One', domain, 'study-tag', '#study-tag',
        'Book One #study-tag', 'Author One #study-tag',
        'book:"Book One" author:"Author One" #study-tag', 'leon84ych',
        'book:"Book One" author:"Author One" #study-tag contributor:"leon84ych@gmail.com"']) {
        search.query.set(query);
        expect(fixture.componentInstance.searchTerm()).toBe(query);
        expect(fixture.componentInstance.filteredRows()).toEqual([row]);
      }
      const other = { ...row, id: 'entry-2', contributor: 'other@gmail.com' };
      fixture.componentInstance.rows.set([row, other] as never[]);
      search.query.set('contributor:"leon84ych@gmail.com"');
      expect(fixture.componentInstance.filteredRows()).toEqual([row]);
      search.query.set('contributor:"other@gmail.com"');
      expect(fixture.componentInstance.filteredRows()).toEqual([other]);
      fixture.componentInstance.rows.set([row] as never[]);
      search.query.set('Author One #study-tag #missing');
      expect(fixture.componentInstance.filteredRows()).toEqual([]);
      search.query.set('book:"Other Book" author:"Author One" #study-tag');
      expect(fixture.componentInstance.filteredRows()).toEqual([]);
      search.query.set('no match');
      expect(fixture.componentInstance.filteredRows()).toEqual([]);
      fixture.componentInstance.searchTerm.set('');
      expect(search.query()).toBe('');
      expect(fixture.componentInstance.filteredRows()).toEqual([row]);
    });
  }

  it('inherits the keyword in Learn and Quiz, reloads on changes, and retains it on navigation', async () => {
    vi.useFakeTimers();
    const search = TestBed.inject(StudySearchService);
    search.query.set('Author One');
    const learn = TestBed.createComponent(Learn);
    const quiz = TestBed.createComponent(QuestionPracticeComponent);
    learn.detectChanges();
    quiz.detectChanges();
    await vi.advanceTimersByTimeAsync(250);
    expect(loadLearnBatch).toHaveBeenLastCalledWith(expect.any(Set), 20, 'Author One');
    expect(loadQuestionBatch).toHaveBeenLastCalledWith({ query: 'Author One' });

    quiz.componentInstance.onSearchInput('study-tag');
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(250);
    expect(learn.componentInstance.searchQuery()).toBe('study-tag');
    expect(loadLearnBatch).toHaveBeenLastCalledWith(expect.any(Set), 20, 'study-tag');
    learn.destroy();
    const returningLearn = TestBed.createComponent(Learn);
    returningLearn.detectChanges();
    await vi.advanceTimersByTimeAsync(250);
    expect(returningLearn.componentInstance.searchQuery()).toBe('study-tag');

    returningLearn.componentInstance.onSearchInput('');
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(250);
    expect(quiz.componentInstance.searchQuery()).toBe('');
    expect(loadQuestionBatch).toHaveBeenLastCalledWith({ query: '' });
  });

  it('discards older Learn and Quiz results after the shared keyword changes', async () => {
    vi.useFakeTimers();
    let resolveLearn!: (entries: unknown[]) => void;
    let resolveQuiz!: (entries: unknown[]) => void;
    loadLearnBatch.mockImplementationOnce(() => new Promise((resolve) => { resolveLearn = resolve; }));
    loadQuestionBatch.mockImplementationOnce(() => new Promise((resolve) => { resolveQuiz = resolve; }));
    const learn = TestBed.createComponent(Learn);
    const quiz = TestBed.createComponent(QuestionPracticeComponent);
    learn.detectChanges();
    quiz.detectChanges();
    await vi.advanceTimersByTimeAsync(250);
    TestBed.inject(StudySearchService).query.set('new keyword');
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(250);
    resolveLearn([{ id: 'stale' }]);
    resolveQuiz([{ id: 'stale' }]);
    await Promise.resolve();
    expect(learn.componentInstance.entries()).toEqual([]);
    expect(quiz.componentInstance.questions()).toEqual([]);
    expect(learn.componentInstance.isLoading()).toBe(false);
    expect(quiz.componentInstance.isLoading()).toBe(false);
  });
});