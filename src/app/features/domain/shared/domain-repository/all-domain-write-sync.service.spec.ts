// @vitest-environment jsdom

import 'fake-indexeddb/auto';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../../../core/services/config/config.service';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { IndexedDB, LocalDBService } from '../../../../shared/local-db/local-db.service';
import { DomainName } from '../../../catalog/book-detail/models/domain-sheet-config';
import { GoogleAuthService } from '../../../authentication/services/google-auth-service';
import { AssociationGASRepository } from '../../associations/services/associations-gas-repository';
import { CharacterGASRepository } from '../../characters/services/characters-gas-repository';
import { ConceptGASRepository } from '../../concepts/services/concepts-gas-repository';
import { BookEventGASRepository } from '../../events/services/book-events-gas-repository';
import { GlossaryGASRepository } from '../../glossary/services/glossary-gas-repository';
import { PlaceGASRepository } from '../../places/services/places-gas-repository';
import { QuestionGASRepository } from '../../questions/services/questions-gas-repository';
import { QuoteGASRepository } from '../../quotes/services/quotes-gas-repository';
import { RelationGASRepository } from '../../relations/services/relations-gas-repository';
import { Domain } from '../model/domain-shared-model';
import { AllDomainWriteSyncService } from './all-domain-write-sync.service';

describe('AllDomainWriteSyncService', () => {
  const name = 'all-domain-write-sync-spec';
  let database: IndexedDB;
  let token: ReturnType<typeof signal<string | null>>;
  const gateway = {
    addDomainItem: vi.fn(),
    updateDomainItem: vi.fn(),
    deleteDomainItem: vi.fn(),
    getDomain: vi.fn(),
  };
  const showError = vi.fn();
  const record: Domain = {
    id: 'temporary',
    bookId: 'book',
    bookRow: 3,
    itemRow: 0,
    tags: [],
    contributor: '',
    syncStatus: 'pending',
  };
  const cases: [DomainName, string][] = [
    ['CONCEPTS', 'concepts'],
    ['QUOTES', 'quotes'],
    ['CHARACTER', 'characters'],
    ['PLACES', 'places'],
    ['BOOK_EVENTS', 'bookEvents'],
    ['RELATIONS', 'relations'],
    ['ASSOCIATIONS', 'associations'],
    ['GLOSARY', 'glossary'],
    ['QUESTIONS', 'questions'],
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    Dexie.dependencies.indexedDB = indexedDB;
    Dexie.dependencies.IDBKeyRange = IDBKeyRange;
    database = new IndexedDB(name);
    token = signal<string | null>(null);
    gateway.addDomainItem.mockImplementation(async (entry: Domain) => ({
      ...entry,
      id: 'server-id',
      syncStatus: 'synced',
    }));
    gateway.updateDomainItem.mockImplementation(async (entry: Domain) => ({
      ...entry,
      syncStatus: 'synced',
    }));
    TestBed.configureTestingModule({
      providers: [
        { provide: LocalDBService, useValue: { indexedDB: database } },
        {
          provide: ConfigService,
          useValue: {
            localSampleDataEnabled: signal(false),
            isLocalSampleDataEnabled: () => false,
            getGasTimeoutMs: () => 60_000,
          },
        },
        {
          provide: GoogleAuthService,
          useValue: {
            idToken: token,
            currentUser: signal({ email: 'owner@example.com' }),
          },
        },
        { provide: GlobalMessageService, useValue: { showError } },
        { provide: TranslocoService, useValue: { translate: (key: string) => key } },
        ...[
          AssociationGASRepository,
          CharacterGASRepository,
          ConceptGASRepository,
          BookEventGASRepository,
          GlossaryGASRepository,
          PlaceGASRepository,
          QuestionGASRepository,
          QuoteGASRepository,
          RelationGASRepository,
        ].map((provide) => ({ provide, useValue: gateway })),
      ],
    });
  });

  afterEach(async () => {
    TestBed.resetTestingModule();
    database.close();
    await Dexie.delete(name);
  });

  it.each(cases)('queues %s locally and syncs it after reconnecting', async (domain, table) => {
    const service = TestBed.inject(AllDomainWriteSyncService);
    await service.save(domain, record, false);
    expect(await database.table(table).get(['book', 'temporary'])).toMatchObject({
      syncStatus: 'pending',
    });
    expect(gateway.addDomainItem).not.toHaveBeenCalled();
    token.set('token');
    TestBed.tick();
    await vi.waitFor(async () =>
      expect(await database.table(table).get(['book', 'server-id'])).toMatchObject({
        syncStatus: 'synced',
      }),
    );
  });

  it.each(cases)('preserves the created %s ID when the server returns it', async (domain, table) => {
    const entry = { ...record, id: `book_${domain}_1800000000000` };
    gateway.addDomainItem.mockImplementation(async (value: Domain) => ({
      ...value,
      syncStatus: 'synced',
    }));
    const service = TestBed.inject(AllDomainWriteSyncService);
    await service.save(domain, entry, false);
    token.set('token');
    TestBed.tick();

    await vi.waitFor(async () =>
      expect(await database.table(table).get(['book', entry.id])).toMatchObject({
        id: entry.id,
        syncStatus: 'synced',
      }),
    );
    expect(gateway.addDomainItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: entry.id }),
      expect.any(AbortSignal),
    );
  });

  it.each(cases)('queues an edited %s and preserves its review state', async (domain, table) => {
    const service = TestBed.inject(AllDomainWriteSyncService);
    const original = { ...record, id: 'existing', itemRow: 8, interval: 16, recalled: 3 };
    await database.table(table).put(original);
    await service.save(domain, { ...original, interval: 2, recalled: 0, title: 'Edited' }, true);
    expect(await database.table(table).get(['book', 'existing'])).toMatchObject({
      title: 'Edited',
      syncStatus: 'pending',
      interval: 16,
      recalled: 3,
    });
    expect(gateway.updateDomainItem).not.toHaveBeenCalled();
    token.set('token');
    TestBed.tick();
    await vi.waitFor(async () =>
      expect(await database.table(table).get(['book', 'existing'])).toMatchObject({
        title: 'Edited',
        syncStatus: 'synced',
        interval: 16,
        recalled: 3,
      }),
    );
    expect(gateway.updateDomainItem).toHaveBeenCalledOnce();
  });

  it('resumes a persisted write when the service starts', async () => {
    await database.concepts.put({
      ...record,
      term: 'Term',
      definition: 'Definition',
      category: '',
      source: '',
      feed: 5,
    });
    await database.pendingDomainWrites.put({
      domain: 'CONCEPTS',
      bookId: 'book',
      id: 'temporary',
      record,
      operation: 'create',
      state: 'queued',
      revision: 1,
      ownerEmail: 'owner@example.com',
    });
    token.set('token');
    TestBed.inject(AllDomainWriteSyncService);
    TestBed.tick();
    await vi.waitFor(async () =>
      expect(await database.concepts.get(['book', 'server-id'])).toMatchObject({
        syncStatus: 'synced',
      }),
    );
  });

  it('waits for linked concepts and sends their server IDs in the association', async () => {
    let finishConcept!: (value: Domain) => void;
    gateway.addDomainItem.mockImplementation((entry: Domain) => {
      if (entry.id === 'concept-temp')
        return new Promise<Domain>((resolve) => {
          finishConcept = resolve;
        });
      return Promise.resolve({ ...entry, id: 'association-server', syncStatus: 'synced' });
    });
    token.set('token');
    const service = TestBed.inject(AllDomainWriteSyncService);
    const concept = { ...record, id: 'concept-temp', term: 'Term' };
    const association = {
      ...record,
      id: 'association-temp',
      sourceConceptId: concept.id,
      targetConceptId: concept.id,
    };
    await service.save('CONCEPTS', concept, false);
    await vi.waitFor(() => expect(gateway.addDomainItem).toHaveBeenCalledOnce());
    await service.save('ASSOCIATIONS', association, false);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(gateway.addDomainItem).toHaveBeenCalledOnce();
    finishConcept({ ...concept, id: 'concept-server', syncStatus: 'synced' });
    await vi.waitFor(() => expect(gateway.addDomainItem).toHaveBeenCalledTimes(2));
    expect(gateway.addDomainItem.mock.calls[1][0]).toMatchObject({
      sourceConceptId: 'concept-server',
      targetConceptId: 'concept-server',
    });
    await vi.waitFor(async () =>
      expect(await database.associations.get(['book', 'association-server'])).toMatchObject({
        sourceConceptId: 'concept-server',
        syncStatus: 'synced',
      }),
    );
  });

  it.each([
    [
      'RELATIONS',
      { sourceCharacterId: 'origin-temp', targetCharacterId: 'origin-temp' },
      { sourceCharacterId: 'origin-server', targetCharacterId: 'origin-server' },
    ],
    [
      'BOOK_EVENTS',
      { mainCharacterId: 'origin-temp', secondaryCharacterIds: ['origin-temp'] },
      { mainCharacterId: 'origin-server', secondaryCharacterIds: ['origin-server'] },
    ],
    [
      'QUESTIONS',
      { sourceDomain: 'CHARACTER', sourceRowId: 'origin-temp' },
      { sourceDomain: 'CHARACTER', sourceRowId: 'origin-server' },
    ],
  ] as const)('waits for character IDs in %s writes', async (domain, fields, expected) => {
    let finishCharacter!: (value: Domain) => void;
    gateway.addDomainItem.mockImplementation((entry: Domain) => {
      if (entry.id === 'origin-temp')
        return new Promise<Domain>((resolve) => {
          finishCharacter = resolve;
        });
      return Promise.resolve({ ...entry, id: 'child-server', syncStatus: 'synced' });
    });
    token.set('token');
    const service = TestBed.inject(AllDomainWriteSyncService);
    const character = { ...record, id: 'origin-temp', name: 'Character' };
    await service.save('CHARACTER', character, false);
    await vi.waitFor(() => expect(gateway.addDomainItem).toHaveBeenCalledOnce());
    await service.save(domain, { ...record, id: 'child-temp', ...fields }, false);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(gateway.addDomainItem).toHaveBeenCalledOnce();
    finishCharacter({ ...character, id: 'origin-server', syncStatus: 'synced' });
    await vi.waitFor(() => expect(gateway.addDomainItem).toHaveBeenCalledTimes(2));
    expect(gateway.addDomainItem.mock.calls[1][0]).toMatchObject(expected);
    const table = cases.find(([name]) => name === domain)?.[1];
    if (!table) throw new Error(`Missing table for ${domain}`);
    await vi.waitFor(async () =>
      expect(await database.table(table).get(['book', 'child-server'])).toMatchObject({
        syncStatus: 'synced',
      }),
    );
  });

  it('does not send a linked entry whose referenced record is missing', async () => {
    token.set('token');
    const service = TestBed.inject(AllDomainWriteSyncService);
    await service.save(
      'RELATIONS',
      {
        ...record,
        sourceCharacterId: 'missing',
        targetCharacterId: 'missing',
      },
      false,
    );
    await vi.waitFor(() => expect(showError).toHaveBeenCalledWith('DOMAINS.SYNC.SYNC_DEPENDENCY'));
    expect(gateway.addDomainItem).not.toHaveBeenCalled();
    expect(await service.getWrite('RELATIONS', record)).toMatchObject({ state: 'queued' });
  });

  it('waits for a place referenced by an event', async () => {
    let finishPlace!: (value: Domain) => void;
    gateway.addDomainItem.mockImplementation((entry: Domain) => {
      if (entry.id === 'place-temp')
        return new Promise<Domain>((resolve) => {
          finishPlace = resolve;
        });
      return Promise.resolve({ ...entry, id: 'event-server', syncStatus: 'synced' });
    });
    token.set('token');
    const service = TestBed.inject(AllDomainWriteSyncService);
    const place = { ...record, id: 'place-temp', name: 'Place' };
    await service.save('PLACES', place, false);
    await vi.waitFor(() => expect(gateway.addDomainItem).toHaveBeenCalledOnce());
    await service.save('BOOK_EVENTS', { ...record, id: 'event-temp', placeId: place.id }, false);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(gateway.addDomainItem).toHaveBeenCalledOnce();
    finishPlace({ ...place, id: 'place-server', syncStatus: 'synced' });
    await vi.waitFor(() => expect(gateway.addDomainItem).toHaveBeenCalledTimes(2));
    expect(gateway.addDomainItem.mock.calls[1][0]).toMatchObject({ placeId: 'place-server' });
    await vi.waitFor(async () =>
      expect(await database.bookEvents.get(['book', 'event-server'])).toMatchObject({
        syncStatus: 'synced',
      }),
    );
  });
});
