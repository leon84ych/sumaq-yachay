import { Injectable, signal } from '@angular/core';

const WEB_APP_URL_KEY = 'sumaq_yachay_web_app_url';
const LOCAL_SAMPLE_DATA_KEY = 'sumaq_yachay_local_sample_data_enabled';
const FEED_MAX_INTERVAL_DAYS_KEY = 'sumaq_yachay_feed_max_interval_days';
const DEFAULT_GAS_TIMEOUT_MS = 60_000;
export const DEFAULT_FEED_MAX_INTERVAL_DAYS = 256;
const DEFAULT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbyQ541zFbZU4FEbXJM0ppG1cVdX35DGFToUzRBwH_m9OoDASUaHoZgN5KTECqZ7C_zjpg/exec';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private urlSignal = signal<string>(this.loadStoredUrl());
  private timeoutSignal = signal(DEFAULT_GAS_TIMEOUT_MS);
  private localSampleDataSignal = signal<boolean>(this.loadStoredLocalSampleDataEnabled());
  private feedMaxIntervalDaysSignal = signal<number>(this.loadStoredFeedMaxIntervalDays());

  readonly webAppUrl = this.urlSignal.asReadonly();
  readonly gasRequestTimeoutMs = this.timeoutSignal.asReadonly();
  readonly localSampleDataEnabled = this.localSampleDataSignal.asReadonly();
  readonly feedMaxIntervalDays = this.feedMaxIntervalDaysSignal.asReadonly();

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

  getFeedMaxIntervalDays(): number {
    return this.feedMaxIntervalDaysSignal();
  }

  setFeedMaxIntervalDays(days: number): void {
    if (!this.isPowerOfTwo(days)) {
      throw new RangeError('The maximum feed interval must be a positive power of two.');
    }

    this.feedMaxIntervalDaysSignal.set(days);
    localStorage.setItem(FEED_MAX_INTERVAL_DAYS_KEY, String(days));
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

  private loadStoredFeedMaxIntervalDays(): number {
    try {
      const stored = Number(localStorage.getItem(FEED_MAX_INTERVAL_DAYS_KEY));
      return this.isPowerOfTwo(stored) ? stored : DEFAULT_FEED_MAX_INTERVAL_DAYS;
    } catch {
      return DEFAULT_FEED_MAX_INTERVAL_DAYS;
    }
  }

  private isPowerOfTwo(value: number): boolean {
    return Number.isSafeInteger(value) && value > 0 && Number.isInteger(Math.log2(value));
  }
}
