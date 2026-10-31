import { Injector, Signal, Type, WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogApiService } from '../../features/catalog/services/catalog-api.service';
import { CatalogService } from '../../features/catalog/services/catalog.service';
import { GoogleAuthService } from '../../features/authentication/services/google-auth-service';
import { DomainDataService } from '../../features/catalog-detail/services/domain-data.service';
import { DomainAssociationComponent } from '../../features/domain/domain-association/domain-association/domain-association.component';
import { DomainBookEventsComponent } from '../../features/domain/domain-book-events/domain-book-events/domain-book-events.component';
import { DomainCharacterComponent } from '../../features/domain/domain-character/domain-character/domain-character.component';
import { DomainConceptsComponent } from '../../features/domain/domain-concepts/domain-concept/domain-concept.component';
import { DomainGlossaryComponent } from '../../features/domain/domain-glosary/domain-glosary/domain-glossary.component';
import { DomainPassageComponent } from '../../features/domain/domain-passages/domain-passage/domain-passage.component';
import { DomainPlacesComponent } from '../../features/domain/domain-places/domain-places/domain-places.component';
import { QuestionsComponent } from '../../features/domain/domain-questions/domain-questions/question.component';
import { QuestionPracticeComponent } from '../../features/domain/domain-questions/practice/question-practice.component';
import { QuestionAttemptService } from '../../features/domain/domain-questions/services/question-attempt.service';
import { QuestionPracticeService } from '../../features/domain/domain-questions/services/question-practice.service';
import { DomainQuoteComponent } from '../../features/domain/domain-quotes/domain-quote/domain-quote.component';
import { DomainRelationsComponent } from '../../features/domain/domain-relations/domain-relations/domain-relations.component';
import { DomainIndexComponent } from '../../features/domain/domain-index/domain-index/domain-index.component';
import { Learn } from '../../features/learn/learn/learn.component';
import { LearnFeedService } from '../../features/learn/services/learn-feed.service';
import { AppDbService } from './storage/app-db.service';
import { TaxonomyService } from './taxonomy/taxonomy.service';
import { ConfigService } from './config.service';
import { PermissionService } from './permission.service';
import { StudySearchService } from './study-search.service';
import { matchesStudySearch, parseStudySearch } from '../../shared/utils/study-search';

interface DomainSearchView {
  searchTerm: WritableSignal<string>;
  filteredRows: Signal<unknown[]>;
}

const domainViews: { component: Type<DomainSearchView>; domain: string }[] = [
  { component: DomainIndexComponent, domain: 'index' },
  { component: QuestionsComponent, domain: 'questions' },
  { component: DomainConceptsComponent, domain: 'concepts' },
  { component: DomainCharacterComponent, domain: 'characters' },
  { component: DomainGlossaryComponent, domain: 'glossary' },
  { component: DomainPassageComponent, domain: 'passages' },
  { component: DomainPlacesComponent, domain: 'places' },
  { component: DomainQuoteComponent, domain: 'quotes' },
  { component: DomainBookEventsComponent, domain: 'book events' },
  { component: DomainAssociationComponent, domain: 'associations' },
  { component: DomainRelationsComponent, domain: 'relations' },
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
        { provide: LearnFeedService, useValue: { loadRandomBatch: loadLearnBatch, canFetchRemote: () => false } },
        { provide: QuestionPracticeService, useValue: {
          loadRandomBatch: loadQuestionBatch, optionsFor: () => [],
        } },
        { provide: QuestionAttemptService, useValue: {} },
        { provide: TranslocoService, useValue: { translate: (key: string) => key } },
        { provide: DomainDataService, useValue: { sheets: signal([]) } },
        { provide: TaxonomyService, useValue: { isTagAllowed: () => true } },
        { provide: PermissionService, useValue: {
          role: signal('admin'), validatePermission: () => true,
        } },
        { provide: ConfigService, useValue: {
          isLocalSampleDataEnabled: () => false, localSampleDataEnabled: signal(false),
        } },
        { provide: AppDbService, useValue: {
          db: {
            catalogs: { toArray: async () => [] },
            tables: [{ name: 'concepts', toArray: async () => relatedRows }],
          },
        } },
        { provide: CatalogApiService, useValue: {} },
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
    const catalog = Injector.create({ providers: [], parent }).get(StudySearchService);
    const learn = Injector.create({ providers: [], parent }).get(StudySearchService);
    const questions = Injector.create({ providers: [], parent }).get(StudySearchService);

    expect(catalog.query()).toBe('');
    catalog.query.set('Kafka');
    expect(learn.query()).toBe('Kafka');
    expect(questions.query()).toBe('Kafka');
    questions.query.set('architecture');
    expect(catalog.query()).toBe('architecture');
    learn.query.set('');
    expect(catalog.query()).toBe('');
    expect(questions.query()).toBe('');
  });

  it('uses the shared keyword to filter catalog book names, authors, and topics', async () => {
    const catalog = TestBed.inject(CatalogService);
    await catalog.loadFromLocal();
    const entry = {
      id: 'book-1', row: 1, name: 'Book One', author: 'Author One', subject: 'Science',
      topic: 'Physics', active: true, count: 1, updatedAt: '',
    };
    catalog.items.set([entry]);
    const search = TestBed.inject(StudySearchService);
    for (const query of ['Book One', 'Author One', 'Physics', 'book:"Book One"', 'author:"Author One"']) {
      search.query.set(query);
      expect(catalog.filteredItems()).toEqual([entry]);
    }
    search.query.set('not present');
    expect(catalog.filteredItems()).toEqual([]);
    search.query.set('');
    expect(catalog.filteredItems()).toEqual([entry]);
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
    const catalogs = [
      { id: 'one', row: 1, name: 'Book One', author: 'Author One' },
      { id: 'two', row: 2, name: 'Book Two', author: 'Author Two' },
    ];
    const concepts = [
      { id: 'matching', row: 1, term: 'Memory', tags: ['#memory', '#identity'] },
      { id: 'prefix-only', row: 1, term: 'Memory loss', tags: ['#memory-loss', '#identity'] },
      { id: 'other-author', row: 2, term: 'Memory', tags: ['#memory', '#identity'] },
    ].map((row) => ({ ...row, contributor: 'leon84ych@gmail.com' }));
    concepts.push({
      id: 'other-contributor', row: 1, term: 'Memory', tags: ['#memory', '#identity'],
      contributor: 'other@gmail.com',
    });
    const questions = concepts.map((row) => ({
      ...row, question: row.term, answer: 'Answer', sourceDomain: 'CONCEPTS', type: 'open',
    }));
    const emptyTable = { toArray: async () => [] };
    Object.assign(TestBed.inject(AppDbService).db, {
      catalogs: { toArray: async () => catalogs },
      concepts: { toArray: async () => concepts },
      questions: { toArray: async () => questions },
      quotes: emptyTable, passages: emptyTable, characters: emptyTable, places: emptyTable,
      relationsCharacters: emptyTable, relationsConcepts: emptyTable, glosary: emptyTable,
    });
    const feed = TestBed.runInInjectionContext(() => new LearnFeedService());
    const practice = TestBed.runInInjectionContext(() => new QuestionPracticeService());
    const query = 'book:"Book One" author:"Author One" #memory #identity contributor:"leon84ych@gmail.com"';
    const entries = await feed.loadRandomBatch(new Set(), 20, query);
    const batch = await practice.loadRandomBatch({ query });
    expect(entries).toHaveLength(2);
    expect(entries.every((entry) => entry.bookAuthor === 'Author One')).toBe(true);
    expect(entries.every((entry) => entry.sourceRow['id'] === 'matching')).toBe(true);
    expect(batch.map((entry) => entry.id)).toEqual(['matching']);
    expect(await feed.loadRandomBatch(new Set(), 20, `${query} #missing`)).toEqual([]);
    expect(await practice.loadRandomBatch({ query: `${query} #missing` })).toEqual([]);
  });

  it('finds catalog books through tags and domains in locally stored learning content', async () => {
    vi.useFakeTimers();
    const catalog = TestBed.inject(CatalogService);
    await catalog.loadFromLocal();
    catalog.items.set([
      { id: 'one', row: 1, name: 'Book One', author: 'Author', subject: 'Science',
        topic: 'Physics', active: true, count: 1, updatedAt: '' },
      { id: 'two', row: 2, name: 'Book Two', author: 'Author', subject: 'Science',
        topic: 'Biology', active: true, count: 1, updatedAt: '' },
    ]);
    relatedRows = [{ id: 'concept', row: 1, term: 'Entropy', tags: ['#study-tag'], contributor: 'leon84ych@gmail.com' }];
    const search = TestBed.inject(StudySearchService);
    for (const query of ['study-tag', 'concepts', 'Author #study-tag', 'Book One #study-tag',
      'book:"Book One" author:"Author" #study-tag',
      'book:"Book One" author:"Author" #study-tag contributor:"leon84ych@gmail.com"']) {
      search.query.set(query);
      TestBed.tick();
      await vi.advanceTimersByTimeAsync(250);
      expect(catalog.filteredItems().map((entry) => entry.id)).toEqual(['one']);
    }
    relatedRows.push({ id: 'other-concept', row: 2, term: 'Entropy', tags: ['#study-tag'],
      contributor: 'other@gmail.com' });
    for (const [contributor, expectedId] of [['leon84ych@gmail.com', 'one'], ['other@gmail.com', 'two']]) {
      search.query.set(`contributor:${JSON.stringify(contributor)}`);
      TestBed.tick();
      await vi.advanceTimersByTimeAsync(250);
      expect(catalog.filteredItems().map((entry) => entry.id)).toEqual([expectedId]);
    }
    search.query.set('unknown-tag');
    expect(catalog.filteredItems()).toEqual([]);
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(250);
    expect(catalog.filteredItems()).toEqual([]);
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
      fixture.componentRef.setInput('rows', [row]);
      fixture.componentRef.setInput('bookName', 'Book One');
      fixture.componentRef.setInput('bookAuthor', 'Author One');
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
      fixture.componentRef.setInput('rows', [row, other]);
      search.query.set('contributor:"leon84ych@gmail.com"');
      expect(fixture.componentInstance.filteredRows()).toEqual([row]);
      search.query.set('contributor:"other@gmail.com"');
      expect(fixture.componentInstance.filteredRows()).toEqual([other]);
      fixture.componentRef.setInput('rows', [row]);
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