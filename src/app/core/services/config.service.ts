import { Injectable, signal } from '@angular/core';

const WEB_APP_URL_KEY = 'sumaq_yachay_web_app_url';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private urlSignal = signal<string>(this.loadStoredUrl());

  readonly webAppUrl = this.urlSignal.asReadonly();

  getWebAppUrl(): string {
    return this.urlSignal();
  }

  setWebAppUrl(url: string): void {
    const trimmed = url.trim();
    this.urlSignal.set(trimmed);
    if (trimmed) {
      localStorage.setItem(WEB_APP_URL_KEY, trimmed);
    } else {
      localStorage.removeItem(WEB_APP_URL_KEY);
    }
  }

  private loadStoredUrl(): string {
    try {
      return localStorage.getItem(WEB_APP_URL_KEY) || '';
    } catch {
      return '';
    }
  }
}
