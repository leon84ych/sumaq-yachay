// @vitest-environment jsdom

import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import Dexie from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IndexedDB, LocalDBService } from '../local-db/local-db.service';
import { DEFAULT_LANGUAGE_NAMES, DEFAULT_LANGUAGES, LanguageService } from './language.service';
import { BookQueryService } from '../../features/domain/index/services/book-query.service';
import { GlossaryQueryService } from '../../features/domain/glossary/services/glossary-query.service';
import { GlossaryRepository } from '../../features/domain/glossary/services/glossary-repository';
import { GlossaryDataService } from '../../features/domain/glossary/services/glossary.service';

describe('LanguageService', () => {
  const databaseName = 'language-service-spec';

  afterEach(async () => {
    TestBed.resetTestingModule();
    await Dexie.delete(databaseName);
  });

  it('stores defaults and discovers languages in cached and newly loaded records', async () => {
    const database = new IndexedDB(databaseName);
    await database.books.put({ id: 'book', language: '  Quechua  ' } as never);
    await database.glossary.put({ id: 'term', bookId: 'book', language: 'Aymara' } as never);
    TestBed.configureTestingModule({ providers: [{ provide: LocalDBService, useValue: { indexedDB: database } }] });
    const service = TestBed.inject(LanguageService);

    await vi.waitFor(() => expect(service.languages()).toContain('Quechua'));
    expect(DEFAULT_LANGUAGE_NAMES).toHaveLength(20);
    expect(service.languages()).toContain('Japanese');
    expect(service.languages()).toContain('Japonés');
    expect(service.languages()).toContain('Aymara');
    expect(await database.languages.count()).toBe(DEFAULT_LANGUAGES.length + 2);

    await database.books.put({ id: 'second', language: 'quechua' } as never);
    await database.glossary.put({ id: 'second', bookId: 'book', language: 'Kichwa' } as never);
    await vi.waitFor(() => expect(service.languages()).toContain('Kichwa'));
    expect(service.languages().filter(name => name.toLowerCase() === 'quechua')).toEqual(['Quechua']);
    expect(await database.languages.get('kichwa')).toEqual({ key: 'kichwa', name: 'Kichwa' });

    await database.books.clear();
    await database.glossary.clear();
    expect(await database.languages.get('quechua')).toEqual({ key: 'quechua', name: 'Quechua' });
    TestBed.resetTestingModule();
    database.close();

    const reopened = new IndexedDB(databaseName);
    TestBed.configureTestingModule({ providers: [{ provide: LocalDBService, useValue: { indexedDB: reopened } }] });
    const reloaded = TestBed.inject(LanguageService);
    await vi.waitFor(() => expect(reloaded.languages()).toContain('Quechua'));
    expect(reloaded.languages()).toContain('Kichwa');
    TestBed.resetTestingModule();
    reopened.close();
  });

  it('remembers a language when a glossary entry is saved', async () => {
    const database = new IndexedDB(databaseName);
    const record = { id: 'term', bookId: 'book', language: 'Aymara' };
    TestBed.configureTestingModule({ providers: [
      { provide: LocalDBService, useValue: { indexedDB: database } },
      { provide: BookQueryService, useValue: {} },
      { provide: GlossaryQueryService, useValue: {} },
      { provide: GlossaryRepository, useValue: { addDomainItem: vi.fn().mockResolvedValue(record) } },
    ] });
    await TestBed.inject(GlossaryDataService).addDomainItem(record as never);
    expect(await database.languages.get('aymara')).toEqual({ key: 'aymara', name: 'Aymara' });
    expect(TestBed.inject(LanguageService).languages()).toContain('Aymara');
    TestBed.resetTestingModule();
    database.close();
  });

  it('adds Spanish defaults to an existing English-only language list', async () => {
    const database = new IndexedDB(databaseName);
    await database.languages.bulkPut(DEFAULT_LANGUAGE_NAMES.map(([name]) => ({ key: name.toLowerCase(), name })));
    await database.languages.put({ key: 'quechua', name: 'Quechua' });
    TestBed.configureTestingModule({ providers: [{ provide: LocalDBService, useValue: { indexedDB: database } }] });
    const service = TestBed.inject(LanguageService);
    await vi.waitFor(async () => expect(await database.languages.get('japonés')).toEqual({ key: 'japonés', name: 'Japonés' }));
    for (const [english, spanish] of DEFAULT_LANGUAGE_NAMES) {
      expect(service.languages()).toContain(english);
      expect(service.languages()).toContain(spanish);
    }
    expect(await database.languages.get('japonés')).toEqual({ key: 'japonés', name: 'Japonés' });
    expect(service.languages()).toContain('Quechua');
    TestBed.resetTestingModule();
    database.close();
  });
});