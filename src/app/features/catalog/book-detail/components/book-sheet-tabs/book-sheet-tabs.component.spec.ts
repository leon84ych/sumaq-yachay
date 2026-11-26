// @vitest-environment jsdom

import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it, vi } from 'vitest';
import { BookSheetTabsComponent } from './book-sheet-tabs.component';

describe('BookSheetTabsComponent', () => {
  it('uses the same domains and selection for tabs and the mobile select', () => {
    TestBed.configureTestingModule({
      imports: [TranslocoTestingModule.forRoot({
        langs: { en: { BOOK_DETAIL: { SELECT_VIEW: 'Select view' }, DOMAINS: { DOMAINS: { INDEX: 'Index', CONCEPTS: 'Concepts' } } } },
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      })],
    });
    const fixture = TestBed.createComponent(BookSheetTabsComponent);
    fixture.componentRef.setInput('domainNames', ['INDEX', 'CONCEPTS']);
    fixture.componentRef.setInput('activeDomainName', 'INDEX');
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect([...select.options].map(option => option.value)).toEqual(['INDEX', 'CONCEPTS']);
    expect(select.value).toBe('INDEX');
    const selected = vi.fn();
    fixture.componentInstance.selectTab.subscribe(selected);
    select.value = 'CONCEPTS';
    select.dispatchEvent(new Event('change'));
    expect(selected).toHaveBeenCalledWith('CONCEPTS');
    fixture.componentRef.setInput('activeDomainName', 'CONCEPTS');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="tab"][aria-selected="true"]').textContent).toContain('Concepts');
  });
});