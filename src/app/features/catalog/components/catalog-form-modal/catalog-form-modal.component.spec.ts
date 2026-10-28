import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../../../../public/i18n/en.json';
import es from '../../../../../../public/i18n/es.json';
import { PermissionService } from '../../../../core/services/permission.service';
import { CatalogFormModalComponent } from './catalog-form-modal.component';

describe('Source registration modes', () => {
  let fixture: ComponentFixture<CatalogFormModalComponent>;
  const manual = {
    id: 'book-1',
    name: 'Book One',
    subject: 'Literature',
    topic: 'Memory',
    author: 'Author',
    description: 'Description',
    source: '',
    active: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CatalogFormModalComponent,
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
    TestBed.inject(PermissionService).setRole('admin');
    fixture = TestBed.createComponent(CatalogFormModalComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  function chooseUrl() {
    fixture.nativeElement.querySelector('input[value="url"]').click();
    fixture.detectChanges();
  }

  it('keeps the existing fields and labels for new manual registration', () => {
    const saved = vi.fn();
    fixture.componentInstance.save.subscribe(saved);
    fixture.componentInstance.form.setValue(manual);
    fixture.componentInstance.onSubmit();
    expect(saved).toHaveBeenCalledWith({ item: { ...manual, row: 0, count: 0 }, isEdit: false });
    expect(fixture.nativeElement.querySelector('button[type="submit"]').textContent.trim()).toBe(
      'Register Source',
    );
  });

  it('shows only a URL data field and clone notice when URL is selected', () => {
    chooseUrl();
    const inputs: HTMLInputElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('input:not([type="radio"]), textarea, select'),
    );
    expect(inputs).toHaveLength(1);
    expect(inputs[0].type).toBe('url');
    expect(
      fixture.nativeElement.querySelector('#catalog-source-clone-notice').textContent,
    ).toContain('will be cloned');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').textContent.trim()).toBe(
      'Clone Sheet',
    );
  });

  it('submits the URL without requiring hidden manual fields or emitting a create payload', () => {
    const saved = vi.fn();
    const cloned = vi.fn();
    fixture.componentInstance.save.subscribe(saved);
    fixture.componentInstance.clone.subscribe(cloned);
    chooseUrl();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#catalog-source-url');
    input.value = 'https://docs.google.com/spreadsheets/d/source-id/edit';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
    fixture.componentInstance.onSubmit();
    expect(cloned).toHaveBeenCalledExactlyOnceWith(input.value);
    expect(saved).not.toHaveBeenCalled();
  });

  it('validates the URL and preserves manual values when switching back', () => {
    const cloned = vi.fn();
    fixture.componentInstance.clone.subscribe(cloned);
    fixture.componentInstance.form.setValue(manual);
    chooseUrl();
    fixture.componentInstance.urlForm.setValue({ sheetUrl: 'https://example.com/not-a-sheet' });
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();
    expect(cloned).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.field-error')).not.toBeNull();
    fixture.nativeElement.querySelector('input[value="manual"]').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.getRawValue()).toEqual(manual);
    expect(fixture.nativeElement.querySelector('#name').value).toBe('Book One');
  });

  it('keeps editing in manual mode and preserves the existing ID and row', () => {
    const saved = vi.fn();
    fixture.componentInstance.save.subscribe(saved);
    fixture.componentRef.setInput('editItem', {
      ...manual,
      row: 9,
      count: 3,
      updatedAt: '',
      syncStatus: 'synced',
    });
    fixture.detectChanges();
    fixture.componentInstance.setRegistrationMode('url');
    expect(fixture.componentInstance.isUrlMode()).toBe(false);
    expect(fixture.nativeElement.querySelector('.source-mode')).toBeNull();
    expect(fixture.componentInstance.form.controls.id.disabled).toBe(true);
    fixture.componentInstance.onSubmit();
    expect(saved).toHaveBeenCalledWith(
      expect.objectContaining({
        item: expect.objectContaining({ id: 'book-1', row: 9 }),
        isEdit: true,
      }),
    );
  });

  it('blocks repeated clone submissions, mode changes, and dismissal while pending', () => {
    const cloned = vi.fn();
    const closed = vi.fn();
    fixture.componentInstance.clone.subscribe(cloned);
    fixture.componentInstance.close.subscribe(closed);
    chooseUrl();
    fixture.componentInstance.urlForm.setValue({
      sheetUrl: 'https://docs.google.com/spreadsheets/d/source-id/edit',
    });
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();
    fixture.componentInstance.onSubmit();
    fixture.componentInstance.setRegistrationMode('manual');
    fixture.nativeElement.querySelector('.modal-overlay').click();
    expect(fixture.componentInstance.isUrlMode()).toBe(true);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').textContent).toContain(
      'Cloning Sheet',
    );
    expect(cloned).not.toHaveBeenCalled();
    expect(closed).not.toHaveBeenCalled();
  });

  it('renders errors and Spanish clone labels while preserving existing creation labels', async () => {
    TestBed.inject(TranslocoService).setActiveLang('es');
    chooseUrl();
    fixture.componentRef.setInput('error', 'CATALOG.ERRORS.cloneItemFailed');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').textContent.trim()).toBe(
      'Clonar hoja',
    );
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'No se pudo clonar',
    );
  });

  it('does not expose clone submission to guest or user roles', () => {
    chooseUrl();
    for (const role of ['guest', 'user']) {
      TestBed.inject(PermissionService).setRole(role);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button[type="submit"]')).toBeNull();
    }
  });
});
