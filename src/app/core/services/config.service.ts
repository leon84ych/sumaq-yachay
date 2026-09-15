import { Injectable, computed, signal } from '@angular/core';

const WEB_APP_URL_KEY = 'sumaq_yachay_web_app_url';
const DATA_SOURCE_KEY = 'sumaq_yachay_data_source';

export type DataSource = 'url' | 'sample';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private urlSignal = signal<string>(this.loadStoredUrl());
  private dataSourceSignal = signal<DataSource>(this.loadStoredDataSource());
  private sampleDataFallbackSignal = signal<boolean>(false);

  readonly webAppUrl = this.urlSignal.asReadonly();
  readonly dataSource = this.dataSourceSignal.asReadonly();
  /** True when the active source is 'sample' (also used as a quick check by the *ApiServices). */
  readonly useSampleData = computed(() => this.dataSourceSignal() === 'sample');
  readonly sampleDataFallbackActive = this.sampleDataFallbackSignal.asReadonly();

  getWebAppUrl(): string {
    return this.urlSignal();
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
}

