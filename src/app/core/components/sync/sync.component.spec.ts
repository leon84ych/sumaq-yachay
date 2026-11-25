// @vitest-environment jsdom

import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { LocalDBService, IndexedDB } from '../../../shared/local-db/local-db.service';
import { SyncComponent } from './sync.component';

describe('SyncComponent', () => {
  const databaseName = 'sync-component-spec';
  let database: IndexedDB;

  beforeEach(async () => {
    await Dexie.delete(databaseName);
    database = new IndexedDB(databaseName);
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [
        SyncComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              NAV: {
                SYNC: {
                  PENDING: '{{count}} pending changes',
                  UP_TO_DATE: 'All changes synced',
                },
              },
            },
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [{ provide: LocalDBService, useValue: { indexedDB: database } }],
    }).compileComponents();
  });

  it('shows a green indicator when there are no unsynced records', async () => {
    const fixture = TestBed.createComponent(SyncComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.unsyncedCount()).toBe(0);
    expect(fixture.nativeElement.querySelector('.sync-indicator--pending')).toBeNull();
    expect(fixture.nativeElement.querySelector('.sync-indicator__ball').textContent.trim()).toBe('✓');
  });

  it('counts pending and failed records across tables and updates after sync', async () => {
    await database.quotes.bulkPut([
      { id: 'pending', bookId: 'book-1', bookRow: 1, itemRow: 1, quote: 'q', analysis: '', book: '', author: '', page: '', tags: [], contributor: '', syncStatus: 'pending', feed: 0 },
      { id: 'failed', bookId: 'book-1', bookRow: 1, itemRow: 2, quote: 'q', analysis: '', book: '', author: '', page: '', tags: [], contributor: '', syncStatus: 'error', feed: 0 },
      { id: 'synced', bookId: 'book-1', bookRow: 1, itemRow: 3, quote: 'q', analysis: '', book: '', author: '', page: '', tags: [], contributor: '', syncStatus: 'synced', feed: 0 },
    ]);
    const fixture = TestBed.createComponent(SyncComponent);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.unsyncedCount()).toBe(2));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sync-indicator--pending')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.sync-indicator__ball').textContent.trim()).toBe('2');

    await database.quotes.update(['book-1', 'pending'], { syncStatus: 'synced' });
    await vi.waitFor(() => expect(fixture.componentInstance.unsyncedCount()).toBe(1));
  });
});