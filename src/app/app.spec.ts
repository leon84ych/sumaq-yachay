import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideTransloco } from '@jsverse/transloco';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';
import { TranslocoHttpLoader } from './core/i18n/transloco-loader';

describe('App', () => {
  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideTransloco({
          config: {
            availableLangs: ['en', 'es'],
            defaultLang: 'en',
          },
          loader: TranslocoHttpLoader,
        }),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

});
