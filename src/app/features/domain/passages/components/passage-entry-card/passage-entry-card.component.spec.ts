import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission/permission.service';
import { PassageRecord } from '../../model/passages-model';
import { PassageEntryCardComponent } from './passage-entry-card.component';

const row: PassageRecord = {
  id: 'p1',
  bookId: 'book-1',
  bookRow: 7,
  itemRow: 3,
  title: 'A title',
  passageText: 'A short passage',
  book: 'Book One',
  author: 'Author One',
  page: '12',
  tags: ['#memory'],
  syncStatus: 'synced',
  contributor: 'admin@example.com',
  feed: 5,
};

describe('PassageEntryCardComponent', () => {
  let fixture: ComponentFixture<PassageEntryCardComponent>;
  let component: PassageEntryCardComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
    });
    TestBed.inject(PermissionService).setRole('admin');
    fixture = TestBed.createComponent(PassageEntryCardComponent);
    fixture.componentRef.setInput('row', row);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the passage and its tags', () => {
    expect(fixture.nativeElement.querySelector('h4').textContent).toBe('A title');
    expect(fixture.nativeElement.querySelector('.passage-preview').textContent).toBe(
      'A short passage',
    );
    expect(fixture.nativeElement.querySelectorAll('.passage-tag')).toHaveLength(1);
  });

  it('emits the complete row for edit and read, and the id for delete', () => {
    const edit = vi.fn();
    const read = vi.fn();
    const remove = vi.fn();
    component.editRequested.subscribe(edit);
    component.readRequested.subscribe(read);
    component.deleteRequested.subscribe(remove);

    fixture.nativeElement.querySelector('.domain-edit-button').click();
    fixture.nativeElement.querySelector('.read-passage-button').click();
    fixture.nativeElement.querySelector('.domain-delete-button').click();

    expect(edit).toHaveBeenCalledWith(row);
    expect(read).toHaveBeenCalledWith(row);
    expect(remove).toHaveBeenCalledWith('p1');
  });

  it('opens the internal reader instead of emitting when readerMode is internal', () => {
    fixture.componentRef.setInput('readerMode', 'internal');
    const read = vi.fn();
    component.readRequested.subscribe(read);

    component.requestRead();
    fixture.detectChanges();

    expect(read).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-passage-reader-1')).not.toBeNull();
  });

  it('hides edit and delete actions without permission', () => {
    TestBed.inject(PermissionService).setRole('guest');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.domain-edit-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.domain-delete-button')).toBeNull();
  });
});
