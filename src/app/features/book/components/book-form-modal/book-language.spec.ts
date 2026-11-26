// @vitest-environment jsdom

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../../../core/services/config/config.service';
import { LanguageService } from '../../../../shared/language/language.service';
import { BookFormModalComponent } from './book-form-modal.component';

describe('book language suggestions', () => {
  it('offers shared languages and accepts a new one', () => {
    TestBed.configureTestingModule({
      imports: [TranslocoTestingModule.forRoot({
        langs: { en: {} },
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      })],
      providers: [
        { provide: ConfigService, useValue: { localSampleDataEnabled: signal(true) } },
        { provide: LanguageService, useValue: { languages: signal(['English', 'Japanese', 'Japonés', 'Quechua']) } },
      ],
    });
    const fixture = TestBed.createComponent(BookFormModalComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    const languageInput = fixture.nativeElement.querySelector('#language') as HTMLInputElement;
    languageInput.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    const options = [...fixture.nativeElement.querySelectorAll('[role="option"]')] as HTMLButtonElement[];
    expect(options.map(option => option.textContent?.trim())).toEqual(['English', 'Japanese', 'Japonés', 'Quechua']);
    options[2].click();
    expect(component.form.controls.language.value).toBe('Japonés');
    const save = vi.fn();
    component.save.subscribe(save);
    component.form.patchValue({ id: 'book', name: 'Book', subject: 'Subject', topic: 'Topic', author: 'Author', language: 'Aymara' });
    component.onSubmit();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ item: expect.objectContaining({ language: 'Aymara' }) }));
  });
});