import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { BehaviorSubject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DocumentationComponent } from './documentation.component';

describe('DocumentationComponent', () => {
  let fixture: ComponentFixture<DocumentationComponent>;
  let http: HttpTestingController;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  const index = {
    en: ['000_About.md', '001_Configuration.md'],
    es: ['000_About.md', '001_Configuración.md'],
  };

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ manual: '001' }));
    await TestBed.configureTestingModule({
      imports: [DocumentationComponent, TranslocoTestingModule.forRoot({
        langs: { en: {}, es: {} },
        translocoConfig: { availableLangs: ['en', 'es'], defaultLang: 'en' },
      })],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DocumentationComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('renders the selected page and sanitizes unsafe Markdown HTML', () => {
    http.expectOne('docs/manuals.json').flush(index);
    http.expectOne('docs/en/manual/001_Configuration.md')
      .flush('# Configuration\n\n<img src="missing" onerror="alert(1)">');
    fixture.detectChanges();
    const article: HTMLElement = fixture.nativeElement.querySelector('article');
    expect(article.querySelector('h1')?.textContent).toBe('Configuration');
    expect(article.querySelector('img')?.hasAttribute('onerror')).toBe(false);
    expect(fixture.nativeElement.querySelector('[aria-current="page"]').textContent.trim())
      .toBe('Configuration');
  });

  it('keeps the numeric topic when changing language and cancels stale content', () => {
    http.expectOne('docs/manuals.json').flush(index);
    const previous = http.expectOne('docs/en/manual/001_Configuration.md');
    TestBed.inject(TranslocoService).setActiveLang('es');
    expect(previous.cancelled).toBe(true);
    http.expectOne('docs/manuals.json').flush(index);
    http.expectOne('docs/es/manual/001_Configuraci%C3%B3n.md').flush('# Configuración');
    expect(fixture.componentInstance.state().selected?.order).toBe(1);
    expect(fixture.componentInstance.state().language).toBe('es');
  });

  it('retries failed document loads', () => {
    http.expectOne('docs/manuals.json').flush(index);
    http.expectOne('docs/en/manual/001_Configuration.md')
      .flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    expect(fixture.componentInstance.state().error).toBe(true);
    fixture.componentInstance.retry();
    http.expectOne('docs/manuals.json').flush(index);
    http.expectOne('docs/en/manual/001_Configuration.md').flush('# Configuration');
    expect(fixture.componentInstance.state().error).toBe(false);
  });

  it('handles a missing topic and an empty index without requesting a document', () => {
    http.expectOne('docs/manuals.json').flush({ en: ['000_About.md'], es: [] });
    expect(fixture.componentInstance.state().missing).toBe(true);
    TestBed.inject(TranslocoService).setActiveLang('es');
    http.expectOne('docs/manuals.json').flush({ en: ['000_About.md'], es: [] });
    expect(fixture.componentInstance.state().entries).toEqual([]);
    expect(fixture.componentInstance.state().missing).toBe(false);
  });
});