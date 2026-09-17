import { Injectable, computed, signal } from '@angular/core';

const WEB_APP_URL_KEY = 'sumaq_yachay_web_app_url';
const DATA_SOURCE_KEY = 'sumaq_yachay_data_source';
const GAS_TIMEOUT_KEY = 'sumaq_yachay_gas_timeout_ms';

export const GAS_TIMEOUT_OPTIONS = [30000, 60000, 180000, 360000] as const;

export type DataSource = 'url' | 'sample';
export type GasTimeoutMs = (typeof GAS_TIMEOUT_OPTIONS)[number];

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private urlSignal = signal<string>(this.loadStoredUrl());
  private dataSourceSignal = signal<DataSource>(this.loadStoredDataSource());
  private timeoutSignal = signal<GasTimeoutMs>(this.loadStoredGasTimeout());
  private sampleDataFallbackSignal = signal<boolean>(false);

  readonly webAppUrl = this.urlSignal.asReadonly();
  readonly dataSource = this.dataSourceSignal.asReadonly();
  readonly gasRequestTimeoutMs = this.timeoutSignal.asReadonly();
  /** True when the active source is 'sample', or 'url' but no Web App URL is configured yet. */
  readonly useSampleData = computed(() => this.dataSourceSignal() === 'sample' || !this.urlSignal());
  readonly sampleDataFallbackActive = this.sampleDataFallbackSignal.asReadonly();

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

  /**
   * Selects the active data source: a live Google Apps Script Web App URL,
   * or the static JSON files in public/sample-responses/ (fully offline, no network calls).
   */
  setDataSource(source: DataSource): void {
    this.dataSourceSignal.set(source);
    localStorage.setItem(DATA_SOURCE_KEY, source);
    if (source === 'sample') {
      this.sampleDataFallbackSignal.set(false);
    }
  }

  /**
   * Marks whether the last request served sample data because the live endpoint
   * returned a 404 (e.g. stale deployment). Not persisted — reset per request.
   */
  setSampleDataFallbackActive(active: boolean): void {
    this.sampleDataFallbackSignal.set(active);
  }

  private loadStoredUrl(): string {
    try {
      return localStorage.getItem(WEB_APP_URL_KEY) || '';
    } catch {
      return '';
    }
  }

  private loadStoredDataSource(): DataSource {
    try {
      return localStorage.getItem(DATA_SOURCE_KEY) === 'sample' ? 'sample' : 'url';
    } catch {
      return 'url';
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
}

