import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';
import { DomainEntryCardComponent } from './domain-entry-card.component';
import { Translation } from '@jsverse/transloco';

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
