// @vitest-environment jsdom

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleAuthService } from './google-auth-service';

@Component({ template: '' })
class CatalogPageComponent {}

function createToken(expirationSeconds: number): string {
  const encode = (value: unknown): string =>
    btoa(JSON.stringify(value))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');

  return `${encode({ alg: 'none' })}.${encode({
    name: 'Previous User',
    email: 'previous@example.com',
    picture: 'https://example.com/avatar.png',
    exp: expirationSeconds,
  })}.signature`;
}

describe('GoogleAuthService', () => {
  beforeAll(() => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'catalog', component: CatalogPageComponent },
        ]),
      ],
    });
    localStorage.clear();
  });

  it('clears an expired persisted Google token and restores sign-in state', () => {
    localStorage.setItem('g_id_token', createToken(Math.floor(Date.now() / 1000) - 60));

    const service = TestBed.inject(GoogleAuthService);

    expect(service.idToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.isSignedIn()).toBe(false);
    expect(localStorage.getItem('g_id_token')).toBeNull();
  });

  it('deletes all authentication state when the session is cleared', () => {
    localStorage.setItem('g_id_token', createToken(Math.floor(Date.now() / 1000) + 60));
    const service = TestBed.inject(GoogleAuthService);

    service.clearSession();

    expect(service.idToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.isSignedIn()).toBe(false);
    expect(localStorage.getItem('g_id_token')).toBeNull();
  });

  it('redirects to the catalog after a valid credential is accepted', async () => {
    const token = createToken(Math.floor(Date.now() / 1000) + 60);
    const service = TestBed.inject(GoogleAuthService);
    const router = TestBed.inject(Router);

    service['handleCredentialResponse'](token);

    expect(service.isSignedIn()).toBe(true);
    await vi.waitFor(() => expect(router.url).toBe('/catalog'));
  });
});
