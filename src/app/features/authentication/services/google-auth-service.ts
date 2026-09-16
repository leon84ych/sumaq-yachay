import { Injectable, signal } from '@angular/core';

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
  private readonly TOKEN_KEY = 'g_id_token';

  // State Signals
  readonly idToken = signal<string | null>(this.getStoredToken());
  readonly currentUser = signal<UserProfile | null>(this.decodeUserFromToken(this.getStoredToken()));

  /**
   * Initializes GIS and mounts the Google Sign-In button into a DOM element.
   */
  renderGoogleButton(elementId: string, clientId: string): void {
    if (typeof google === 'undefined' || !google.accounts?.id) {
      console.warn('Google Identity Services SDK not loaded yet.');
      return;
    }

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential: string }) => this.handleCredentialResponse(response.credential),
      auto_select: false,
    });
    const targetElement = document.getElementById(elementId);
    if (targetElement) {
      google.accounts.id.renderButton(targetElement, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        shape: 'rectangular',
        text: 'signin_with',
      });
    }
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.idToken.set(null);
    this.currentUser.set(null);
  }

  private handleCredentialResponse(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    this.idToken.set(token);
    this.currentUser.set(this.decodeUserFromToken(token));
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
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