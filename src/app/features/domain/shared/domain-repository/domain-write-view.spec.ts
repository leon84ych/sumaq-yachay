import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { describe, expect, it, vi } from 'vitest';
import { GlobalMessageService } from '../../../../core/services/global-message.service';
import { PendingDomainWrite } from '../../../../shared/local-db/local-db.service';
import { ConceptRecord } from '../../concepts/model/concepts-model';
import { AllDomainWriteSyncService } from './all-domain-write-sync.service';
import { DomainWriteView } from './domain-write-view';

describe('DomainWriteView', () => {
  it('updates local rows immediately and keeps an edit open across ID replacement', async () => {
    const old: ConceptRecord = {
      id: 'temporary',
      bookId: 'book',
      bookRow: 1,
      itemRow: 0,
      term: 'Term',
      definition: 'Definition',
      category: '',
      source: '',
      tags: [],
      feed: 5,
      contributor: '',
      syncStatus: 'pending',
    };
    const saved = { ...old, id: 'server-id', term: 'Updated' };
    const service = {
      resolveId: vi.fn().mockReturnValue('server-id'),
      save: vi.fn().mockResolvedValue(saved),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AllDomainWriteSyncService, useValue: service },
        { provide: GlobalMessageService, useValue: { showError: vi.fn() } },
        { provide: TranslocoService, useValue: { translate: (key: string) => key } },
      ],
    });
    const rows = signal([old]);
    const view = TestBed.runInInjectionContext(
      () => new DomainWriteView<ConceptRecord>('CONCEPTS', signal('book'), rows),
    );
    expect(view.startEdit(old)).toBe(true);
    rows.set([{ ...old, id: 'server-id' }]);
    expect(view.original('temporary')?.id).toBe('server-id');
    await view.save({ ...old, term: 'Updated' }, 'temporary');
    expect(rows()).toEqual([saved]);
  });

  it('keeps an observed update instead of replacing it with a stale initial fetch', () => {
    const current: ConceptRecord = {
      id: 'one',
      bookId: 'book',
      bookRow: 1,
      itemRow: 1,
      term: 'New',
      definition: 'Definition',
      category: '',
      source: '',
      tags: [],
      feed: 5,
      contributor: '',
      syncStatus: 'pending',
    };
    const unsubscribe = vi.fn();
    const service = {
      watchRecords: (_domain: string, _book: string, update: (rows: ConceptRecord[]) => void) => {
        update([current]);
        return { unsubscribe };
      },
      watchWrites: (
        _domain: string,
        _book: string,
        update: (writes: PendingDomainWrite[]) => void,
      ) => {
        update([
          {
            domain: 'CONCEPTS',
            bookId: 'book',
            id: 'one',
            operation: 'delete',
            state: 'uncertain',
            revision: 1,
            record: current,
          },
        ]);
        return { unsubscribe };
      },
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AllDomainWriteSyncService, useValue: service },
        { provide: GlobalMessageService, useValue: { showError: vi.fn() } },
        { provide: TranslocoService, useValue: { translate: (key: string) => key } },
      ],
    });
    const rows = signal<ConceptRecord[]>([]);
    const view = TestBed.runInInjectionContext(
      () => new DomainWriteView<ConceptRecord>('CONCEPTS', signal('book'), rows),
    );
    view.observe();
    view.initialize([{ ...current, term: 'Old' }]);
    expect(rows()).toEqual([current]);
    expect(view.pendingDeletionIds().has('one')).toBe(true);
    expect(view.retryableIds().has('one')).toBe(true);
    expect(view.startEdit(current)).toBe(false);
  });

  it('updates related options and form selections after a server ID replacement', async () => {
    const synced: ConceptRecord = {
      id: 'server-id',
      bookId: 'book',
      bookRow: 1,
      itemRow: 1,
      term: 'Term',
      definition: 'Definition',
      category: '',
      source: '',
      tags: [],
      feed: 5,
      contributor: '',
      syncStatus: 'synced',
    };
    const service = {
      watchRecords: (_domain: string, _book: string, update: (rows: ConceptRecord[]) => void) => {
        update([synced]);
        return { unsubscribe: vi.fn() };
      },
      resolveStoredId: vi.fn().mockResolvedValue('server-id'),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AllDomainWriteSyncService, useValue: service },
        { provide: GlobalMessageService, useValue: { showError: vi.fn() } },
        { provide: TranslocoService, useValue: { translate: (key: string) => key } },
      ],
    });
    const options = signal<ConceptRecord[]>([]);
    const selected = signal('temporary');
    const view = TestBed.runInInjectionContext(
      () => new DomainWriteView<ConceptRecord>('ASSOCIATIONS', signal('book'), signal([])),
    );
    view.observeRelated('CONCEPTS', options, [selected]);
    await vi.waitFor(() => expect(selected()).toBe('server-id'));
    expect(options()).toEqual([synced]);
  });
});
