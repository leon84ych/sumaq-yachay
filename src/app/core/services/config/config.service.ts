import { Injectable, signal } from '@angular/core';

const WEB_APP_URL_KEY = 'sumaq_yachay_web_app_url';
const LOCAL_SAMPLE_DATA_KEY = 'sumaq_yachay_local_sample_data_enabled';
const DEFAULT_GAS_TIMEOUT_MS = 60_000;
const DEFAULT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbyQ541zFbZU4FEbXJM0ppG1cVdX35DGFToUzRBwH_m9OoDASUaHoZgN5KTECqZ7C_zjpg/exec';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private urlSignal = signal<string>(this.loadStoredUrl());
  private timeoutSignal = signal(DEFAULT_GAS_TIMEOUT_MS);
  private localSampleDataSignal = signal<boolean>(this.loadStoredLocalSampleDataEnabled());

  readonly webAppUrl = this.urlSignal.asReadonly();
  readonly gasRequestTimeoutMs = this.timeoutSignal.asReadonly();
  readonly localSampleDataEnabled = this.localSampleDataSignal.asReadonly();

  getWebAppUrl(): string {
    return this.urlSignal();
  }

  getGasTimeoutMs(): number {
    return this.timeoutSignal();
  }

  setWebAppUrl(url: string): void {
    const trimmed = url.trim().replace(/\/+$/, '');
    this.urlSignal.set(trimmed);
    if (trimmed) {
      localStorage.setItem(WEB_APP_URL_KEY, trimmed);
    } else {
      localStorage.removeItem(WEB_APP_URL_KEY);
    }
  }

  isLocalSampleDataEnabled(): boolean {
    return this.localSampleDataSignal();
  }

  setLocalSampleDataEnabled(enabled: boolean): void {
    this.localSampleDataSignal.set(enabled);
    localStorage.setItem(LOCAL_SAMPLE_DATA_KEY, String(enabled));
  }

  private loadStoredUrl(): string {
    try {
      return localStorage.getItem(WEB_APP_URL_KEY) || DEFAULT_WEB_APP_URL;
    } catch {
      return DEFAULT_WEB_APP_URL;
    }
  }

  private loadStoredLocalSampleDataEnabled(): boolean {
    try {
      return localStorage.getItem(LOCAL_SAMPLE_DATA_KEY) === 'true';
    } catch {
      return false;
    }
  }
}
