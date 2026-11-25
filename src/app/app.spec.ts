import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideTransloco } from '@jsverse/transloco';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';
import { TranslocoHttpLoader } from './core/i18n/transloco-loader';
import { routes } from './app.routes';

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

@Component({ template: '' })
class RouteTestComponent {}

describe('catalog routes', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes.map((route) => route.loadComponent
          ? { ...route, loadComponent: undefined, component: RouteTestComponent }
          : route)),
      ],
    });
  });

  it.each([
    ['/', '/catalog'],
    ['/catalog', '/catalog'],
    ['/catalog/book-1', '/catalog/book-1'],
    ['/books', '/catalog'],
    ['/books/book-1', '/catalog/book-1'],
    ['/book/book-1', '/catalog/book-1'],
  ])('navigates from %s to %s', async (source, expected) => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl(source);
    expect(router.url).toBe(expected);
  });
});
