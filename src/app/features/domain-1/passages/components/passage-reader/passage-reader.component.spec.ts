import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { PassageRecord } from '../../model/passages-model';
import { PassageReaderComponent } from './passage-reader.component';

const passage: PassageRecord = {
  id: 'p1',
  bookId: 'book-1',
  bookRow: 7,
  itemRow: 3,
  title: 'A title',
  passageText: 'word '.repeat(450).trim(),
  book: 'Book One',
  author: 'Author One',
  page: '12',
  tags: ['#memory'],
  syncStatus: 'synced',
  contributor: 'admin@example.com',
  feed: 5,
};

describe('PassageReaderComponent', () => {
  let fixture: ComponentFixture<PassageReaderComponent>;
  let component: PassageReaderComponent;

  beforeEach(() => {
    document.body.style.overflow = '';
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
    });
    fixture = TestBed.createComponent(PassageReaderComponent);
    fixture.componentRef.setInput('passage', passage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the passage title, author, book, page and tags', () => {
    const text: string = fixture.nativeElement.textContent;

    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('A title');
    expect(text).toContain('Author One');
    expect(text).toContain('Book One');
    expect(text).toContain('p. 12');
    expect(fixture.nativeElement.querySelectorAll('.passage-tag')).toHaveLength(1);
  });

  it('locks body scrolling while open and restores it on destroy', () => {
    expect(document.body.style.overflow).toBe('hidden');

    fixture.destroy();

    expect(document.body.style.overflow).toBe('');
  });

  it('clamps the font size between 100% and 200%', () => {
    component.adjustReaderFontSize(-0.5);
    expect(component.readerFontSizePercent()).toBe(100);

    component.adjustReaderFontSize(5);
    expect(component.readerFontSizePercent()).toBe(200);
  });

  it('toggles justification and theme', () => {
    component.toggleReaderJustification();
    expect(component.readerJustified()).toBe(true);

    component.toggleReaderTheme();
    expect(component.readerTheme()).toBe('dark');
  });

  it('estimates reading time from 200 words per minute', () => {
    expect(component.estimateReadingMinutes(passage.passageText)).toBe(3);
    expect(component.estimateReadingMinutes('')).toBe(1);
  });

  it('copies the passage text and reports the status', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await component.copyPassageText();

    expect(writeText).toHaveBeenCalledWith(passage.passageText);
    expect(component.copyStatus()).toBe('copied');
    vi.unstubAllGlobals();
  });

  it('reports a copy failure', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });

    await component.copyPassageText();

    expect(component.copyStatus()).toBe('error');
    vi.unstubAllGlobals();
  });

  it('updates reading progress while scrolling', () => {
    const container = { scrollHeight: 1000, clientHeight: 500, scrollTop: 250 };

    component.updateReadingProgress({ target: container } as unknown as Event);

    expect(component.readingProgress()).toBe(50);
  });

  it('emits closeRequested on Escape and from the close button', () => {
    const closed = vi.fn();
    component.closeRequested.subscribe(closed);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.nativeElement.querySelector('.reader-close-button').click();

    expect(closed).toHaveBeenCalledTimes(2);
  });
});
