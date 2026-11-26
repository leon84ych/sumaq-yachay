import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudySearchService } from '../../../core/services/search/study-search.service';
import { Learn } from './learn.component';
import { LearnFeedService } from '../services/learn-feed.service';

class MockIntersectionObserver implements IntersectionObserver {
  static latest: MockIntersectionObserver | undefined;

  readonly root = null;
  readonly rootMargin = '0px';
  readonly scrollMargin = '0px';
  readonly thresholds: number[] = [];
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();

  constructor(private readonly callback: IntersectionObserverCallback) {
    MockIntersectionObserver.latest = this;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  trigger(): void {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this);
  }
}

describe('Learn', () => {
  const loadRandomBatch = vi.fn();
  const markAsShown = vi.fn();
  const canFetchRemote = vi.fn();

  beforeEach(() => {
    MockIntersectionObserver.latest = undefined;
    loadRandomBatch.mockReset().mockResolvedValue([]);
    markAsShown.mockReset().mockResolvedValue(undefined);
    canFetchRemote.mockReset().mockReturnValue(false);
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    TestBed.configureTestingModule({
      imports: [Learn],
      providers: [
        {
          provide: LearnFeedService,
          useValue: { loadRandomBatch, markAsShown, canFetchRemote },
        },
        { provide: StudySearchService, useValue: { query: signal('') } },
      ],
    });
    TestBed.overrideComponent(Learn, {
      set: { template: '<div #loadMoreTrigger></div>', imports: [] },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('loads the next batch when the feed sentinel enters the viewport', async () => {
    const fixture = TestBed.createComponent(Learn);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.isLoading.set(false);
    fixture.detectChanges();

    const observer = MockIntersectionObserver.latest;
    expect(observer).toBeDefined();
    expect(observer?.observe).toHaveBeenCalledWith(fixture.nativeElement.firstChild);

    const loadMore = vi.spyOn(component, 'loadMore');
    observer?.trigger();

    expect(loadMore).toHaveBeenCalledOnce();
    await loadMore.mock.results[0]?.value;
    fixture.destroy();
  });
});
