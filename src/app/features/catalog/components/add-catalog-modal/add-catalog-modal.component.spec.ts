import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../../../../public/i18n/en.json';
import es from '../../../../../../public/i18n/es.json';
import { AddCatalogModalComponent } from './add-catalog-modal.component';

describe('Clone Master Catalog dialog', () => {
  let fixture: ComponentFixture<AddCatalogModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AddCatalogModalComponent,
        TranslocoTestingModule.forRoot({
          langs: { en, es },
          translocoConfig: {
            availableLangs: ['en', 'es'],
            defaultLang: 'en',
            reRenderOnLangChange: true,
          },
        }),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AddCatalogModalComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('shows the clone warning and action without an option selector', () => {
    const dialog: HTMLElement = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog.querySelector('h2')?.textContent?.trim()).toBe('Clone Master Catalog');
    expect(dialog.querySelector('[type="submit"]')?.textContent?.trim()).toBe(
      'Clone Master Catalog',
    );
    expect(dialog.querySelector('#clone-catalog-notice')?.textContent).toContain(
      'about to be cloned',
    );
    expect(dialog.getAttribute('aria-describedby')).toBe('clone-catalog-notice');
    expect(
      dialog.querySelector('fieldset, input[type="radio"], input[type="checkbox"]'),
    ).toBeNull();
    expect(Object.keys(fixture.componentInstance.form.controls)).toEqual(['sheetUrl']);
  });

  it('submits only the spreadsheet URL, with no option selection required', () => {
    const emitted = vi.fn();
    fixture.componentInstance.add.subscribe(emitted);
    fixture.componentInstance.form.setValue({
      sheetUrl: 'https://docs.google.com/spreadsheets/d/source-id/edit',
    });
    fixture.componentInstance.submit();
    expect(emitted).toHaveBeenCalledExactlyOnceWith({
      sheetUrl: 'https://docs.google.com/spreadsheets/d/source-id/edit',
    });
  });

  it('still rejects invalid spreadsheet links', () => {
    const emitted = vi.fn();
    fixture.componentInstance.add.subscribe(emitted);
    fixture.componentInstance.form.setValue({ sheetUrl: 'https://example.com/not-a-sheet' });
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.form.invalid).toBe(true);
    expect(emitted).not.toHaveBeenCalled();
  });

  it('prevents repeat submission and backdrop dismissal while cloning', () => {
    const emitted = vi.fn();
    const closed = vi.fn();
    fixture.componentInstance.add.subscribe(emitted);
    fixture.componentInstance.close.subscribe(closed);
    fixture.componentInstance.form.setValue({
      sheetUrl: 'https://docs.google.com/spreadsheets/d/source-id/edit',
    });
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();
    fixture.componentInstance.submit();
    fixture.nativeElement.querySelector('.modal-overlay').click();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    expect(emitted).not.toHaveBeenCalled();
    expect(closed).not.toHaveBeenCalled();
  });

  it('uses the clone-only Spanish labels and warning', async () => {
    TestBed.inject(TranslocoService).setActiveLang('es');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('h2').textContent.trim()).toBe(
      'Clonar catálogo maestro',
    );
    expect(fixture.nativeElement.querySelector('[type="submit"]').textContent.trim()).toBe(
      'Clonar catálogo maestro',
    );
    expect(fixture.nativeElement.querySelector('.clone-notice').textContent).toContain(
      'se va a clonar',
    );
  });
});
