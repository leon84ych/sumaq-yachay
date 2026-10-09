import { Injectable, signal } from '@angular/core';

const WEB_APP_URL_KEY = 'sumaq_yachay_web_app_url';
const GAS_TIMEOUT_KEY = 'sumaq_yachay_gas_timeout_ms';
const LOCAL_FIRST_KEY = 'sumaq_yachay_local_first_enabled';

export const GAS_TIMEOUT_OPTIONS = [30000, 60000, 180000, 360000] as const;

export type GasTimeoutMs = (typeof GAS_TIMEOUT_OPTIONS)[number];

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private urlSignal = signal<string>(this.loadStoredUrl());
  private timeoutSignal = signal<GasTimeoutMs>(this.loadStoredGasTimeout());
  private localFirstSignal = signal<boolean>(this.loadStoredLocalFirstEnabled());

  readonly webAppUrl = this.urlSignal.asReadonly();
  readonly gasRequestTimeoutMs = this.timeoutSignal.asReadonly();
  readonly localFirstEnabled = this.localFirstSignal.asReadonly();

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

  setGasTimeoutMs(timeoutMs: number): void {
    const safeTimeout = GAS_TIMEOUT_OPTIONS.includes(timeoutMs as GasTimeoutMs)
      ? (timeoutMs as GasTimeoutMs)
      : 60000;
    this.timeoutSignal.set(safeTimeout);
    localStorage.setItem(GAS_TIMEOUT_KEY, String(safeTimeout));
  }

  isLocalFirstEnabled(): boolean {
    return this.localFirstSignal();
  }

  setLocalFirstEnabled(enabled: boolean): void {
    this.localFirstSignal.set(enabled);
    localStorage.setItem(LOCAL_FIRST_KEY, String(enabled));
  }

  private loadStoredUrl(): string {
    try {
      return localStorage.getItem(WEB_APP_URL_KEY) || '';
    } catch {
      return '';
    }
  }

  private loadStoredGasTimeout(): GasTimeoutMs {
    try {
      const stored = Number(localStorage.getItem(GAS_TIMEOUT_KEY));
      if (GAS_TIMEOUT_OPTIONS.includes(stored as GasTimeoutMs)) {
        return stored as GasTimeoutMs;
      }
    } catch {
      // fall through to default below
    }
    return 60000;
  }

  private loadStoredLocalFirstEnabled(): boolean {
    try {
      return localStorage.getItem(LOCAL_FIRST_KEY) !== 'false';
    } catch {
      return true;
    }
  }
}
