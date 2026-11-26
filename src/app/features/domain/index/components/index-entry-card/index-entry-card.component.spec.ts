// @vitest-environment jsdom

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it, vi } from 'vitest';
import { PermissionService } from '../../../../../core/services/permission/permission.service';
import { StudySearchService } from '../../../../../core/services/search/study-search.service';
import { IndexEntryCardComponent } from './index-entry-card.component';

describe('Index pending deletion card', () => {
  it('shows a review action and hides edit/delete while deletion is pending', () => {
    TestBed.configureTestingModule({
      imports: [TranslocoTestingModule.forRoot({
        langs: { en: { COMMON: { STATUS: { pending: 'Pending' }, EDIT: 'Edit', DELETE: 'Delete' },
          DOMAINS: { INDEX: { DELETE_PENDING: 'Deletion pending synchronization', RETRY_DELETE: 'Review or retry pending deletion', TAGS: 'Tags' } } } },
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      })],
      providers: [
        { provide: PermissionService, useValue: { role: signal('admin'), validatePermission: () => true } },
        { provide: StudySearchService, useValue: { query: signal(''), hasText: () => false, addTag: vi.fn(), addText: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(IndexEntryCardComponent);
    fixture.componentRef.setInput('row', { id: 'item', bookId: 'book', bookRow: 7, itemRow: 8,
      chapter: 'Chapter', theme: 'Theme', subtheme: '', tags: [], contributor: '', feed: 0, syncStatus: 'pending' });
    fixture.componentRef.setInput('pendingDeletion', true);
    fixture.componentRef.setInput('canRetry', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Deletion pending synchronization');
    expect(fixture.nativeElement.querySelector('.domain-edit-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.domain-delete-button')).toBeNull();
    const retry = vi.fn();
    fixture.componentInstance.retryRequested.subscribe(retry);
    const button = fixture.nativeElement.querySelector('button[aria-label="Review or retry pending deletion"]') as HTMLButtonElement;
    expect(button).not.toBeNull();
    button.click();
    expect(retry).toHaveBeenCalledOnce();
  });
});