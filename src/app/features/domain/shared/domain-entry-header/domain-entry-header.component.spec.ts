// @vitest-environment jsdom

import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it, vi } from 'vitest';
import { StudySearchService } from '../../../../core/services/search/study-search.service';
import { DomainEntryHeaderComponent } from './domain-entry-header.component';

describe('DomainEntryHeaderComponent retry', () => {
  it('only exposes a retry button for retryable unsynced items', () => {
    TestBed.configureTestingModule({
      imports: [TranslocoTestingModule.forRoot({
        langs: { en: { COMMON: { RETRY_SYNC: 'Retry synchronization', STATUS: { synced: 'Synced', pending: 'Pending' } }, DOMAINS: { DOMAINS: { INDEX: 'Index' } } } },
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      })],
      providers: [{ provide: StudySearchService, useValue: { hasText: () => false, addText: vi.fn() } }],
    });
    const fixture = TestBed.createComponent(DomainEntryHeaderComponent);
    fixture.componentRef.setInput('domain', 'INDEX');
    fixture.componentRef.setInput('status', 'pending');
    fixture.componentRef.setInput('retryable', true);
    fixture.detectChanges();
    const retry = vi.fn();
    const parentClick = vi.fn();
    fixture.componentInstance.retryRequested.subscribe(retry);
    fixture.nativeElement.addEventListener('click', parentClick);
    const button = fixture.nativeElement.querySelector('button.status-indicator') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Retry synchronization');
    button.click();
    expect(retry).toHaveBeenCalledOnce();
    expect(parentClick).not.toHaveBeenCalled();
    fixture.componentRef.setInput('status', 'synced');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button.status-indicator')).toBeNull();
  });
});