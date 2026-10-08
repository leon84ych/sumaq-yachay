import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

declare const google: any;

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

@Injectable({
  providedIn: 'root',
})
export class GoogleAuthService {
  private readonly router = inject(Router);
  private readonly TOKEN_KEY = 'g_id_token';
  private readonly storedToken = this.getStoredToken();
  private googleInitialized = false;

  // State Signals
  readonly idToken = signal<string | null>(this.storedToken);
  readonly currentUser = signal<UserProfile | null>(this.decodeUserFromToken(this.storedToken));

  initializeGoogleIdentity(clientId: string): void {
    if (this.googleInitialized || typeof google === 'undefined' || !google.accounts?.id) {
      return;
    }

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential: string }) => this.handleCredentialResponse(response.credential),
      auto_select: false,
    });
    this.googleInitialized = true;
  }

  signIn(): void {
    if (!this.googleInitialized || typeof google === 'undefined' || !google.accounts?.id) {
      console.warn('Google Identity Services is not ready yet.');
      return;
    }

    google.accounts.id.prompt();
  }

  isSignedIn(): boolean {
    return Boolean(this.idToken() && this.currentUser());
  }

  clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.idToken.set(null);
    this.currentUser.set(null);
  }

  logout(): void {
    this.clearSession();
  }

  private handleCredentialResponse(token: string): void {
    const user = this.decodeUserFromToken(token);
    if (!user || this.isTokenExpired(token)) {
      this.clearSession();
      return;
    }

    localStorage.setItem(this.TOKEN_KEY, token);
    this.idToken.set(token);
    this.currentUser.set(user);
    this.router.navigateByUrl('/catalog');
  }

  private getStoredToken(): string | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const user = this.decodeUserFromToken(token);

    if (!user || this.isTokenExpired(token)) {
      localStorage.removeItem(this.TOKEN_KEY);
      return null;
    }

    return token;
  }

  private isTokenExpired(token: string | null): boolean {
    if (!token) return true;

    try {
      const payloadBase64 = token.split('.')[1];
      const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = JSON.parse(
        decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        )
      );
      return typeof jsonPayload.exp !== 'number' || jsonPayload.exp <= Date.now() / 1000;
    } catch {
      return true;
    }
  }

  private decodeUserFromToken(token: string | null): UserProfile | null {
    if (!token) return null;
    try {
      const payloadBase64 = token.split('.')[1];
      // Replace URL-safe Base64 characters before decoding
      const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(jsonPayload);
      return {
        name: parsed.name,
        email: parsed.email,
        picture: parsed.picture,
      };
    } catch (err) {
      console.warn('Failed to parse ID token:', err);
      return null;
    }
  }
}