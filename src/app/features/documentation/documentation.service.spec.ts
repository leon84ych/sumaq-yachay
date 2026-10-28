import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DocumentationService } from './documentation.service';

describe('DocumentationService', () => {
  let service: DocumentationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DocumentationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('selects the language, sorts numeric prefixes, and derives readable titles', () => {
    service.entries('es').subscribe((entries) => {
      expect(entries.map((entry) => entry.title)).toEqual(['Acerca de', 'Configuracion', 'Catalogo']);
    });
    http.expectOne('docs/manuals.json').flush({
      en: ['000_About.md'],
      es: ['010_Catalogo.md', '002_Configuracion.md', '000_Acerca_de.md', '../invalid.md'],
    });
  });

  it('loads public Markdown and renders headings, lists, and links', () => {
    service.document('en', '001_Configuration.md').subscribe((html) => {
      expect(html).toContain('<h1>Configuration</h1>');
      expect(html).toContain('<li>Open settings</li>');
      expect(html).toContain('<a href="https://example.com">Source</a>');
    });
    http.expectOne('docs/en/manual/001_Configuration.md')
      .flush('# Configuration\n\n- Open settings\n\n[Source](https://example.com)');
  });

  it('propagates unavailable documents to the viewer error state', () => {
    service.document('es', '000_Acerca_de.md').subscribe({
      next: () => { throw new Error('Expected request failure'); },
      error: (error) => expect(error.status).toBe(404),
    });
    http.expectOne('docs/es/manual/000_Acerca_de.md')
      .flush('Missing', { status: 404, statusText: 'Not Found' });
  });
});