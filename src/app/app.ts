import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ConfigService, DataSource } from './core/services/config.service';

const THEME_KEY = 'sumaq_yachay_theme';
const FONT_SCALE_KEY = 'sumaq_yachay_font_scale';
type Theme = 'light' | 'dark';

// Text-zoom steps applied to the <html> root font-size (rem-based sizing scales with it).
const FONT_SCALE_STEPS = [87.5, 100, 112.5, 125, 137.5];
const DEFAULT_FONT_SCALE_INDEX = 1; // 100%

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, TranslocoPipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly translocoService = inject(TranslocoService);
  readonly configService = inject(ConfigService);
  protected readonly title = signal('sumaq-yachay');

  // Global Data Source Settings Panel State
  readonly showSettings = signal<boolean>(false);
  apiUrlInput = this.configService.getWebAppUrl();

  // Theme State
  readonly theme = signal<Theme>(this.loadInitialTheme());

  // Text Size State
  readonly fontScaleIndex = signal<number>(this.loadInitialFontScaleIndex());
  readonly fontScale = computed(() => FONT_SCALE_STEPS[this.fontScaleIndex()]);
  readonly isMinFontScale = computed(() => this.fontScaleIndex() === 0);
  readonly isMaxFontScale = computed(() => this.fontScaleIndex() === FONT_SCALE_STEPS.length - 1);

  constructor() {
    const savedLang = localStorage.getItem('sumaq_yachay_lang');
    if (savedLang && (savedLang === 'en' || savedLang === 'es')) {
      this.translocoService.setActiveLang(savedLang);
    }

    this.applyTheme(this.theme());
    this.applyFontScale(this.fontScale());
  }

  setLanguage(lang: 'en' | 'es'): void {
    this.translocoService.setActiveLang(lang);
    localStorage.setItem('sumaq_yachay_lang', lang);
  }

  getActiveLang(): string {
    return this.translocoService.getActiveLang();
  }

  selectDataSource(source: DataSource): void {
    this.configService.setDataSource(source);
  }

  saveApiConfig(): void {
    this.configService.setWebAppUrl(this.apiUrlInput);
    this.configService.setDataSource('url');
    this.showSettings.set(false);
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    this.applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  increaseFontSize(): void {
    this.setFontScaleIndex(this.fontScaleIndex() + 1);
  }

  decreaseFontSize(): void {
    this.setFontScaleIndex(this.fontScaleIndex() - 1);
  }

  private setFontScaleIndex(index: number): void {
    const clamped = Math.max(0, Math.min(FONT_SCALE_STEPS.length - 1, index));
    this.fontScaleIndex.set(clamped);
    this.applyFontScale(FONT_SCALE_STEPS[clamped]);
    localStorage.setItem(FONT_SCALE_KEY, String(clamped));
  }

  private applyTheme(theme: Theme): void {
    document.documentElement.dataset['theme'] = theme;
  }

  private applyFontScale(scalePercent: number): void {
    document.documentElement.style.fontSize = `${scalePercent}%`;
  }

  private loadInitialTheme(): Theme {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {
      // localStorage unavailable — fall through to system preference
    }
    const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  private loadInitialFontScaleIndex(): number {
    try {
      const stored = Number(localStorage.getItem(FONT_SCALE_KEY));
      if (Number.isInteger(stored) && stored >= 0 && stored < FONT_SCALE_STEPS.length) {
        return stored;
      }
    } catch {
      // localStorage unavailable — use default
    }
    return DEFAULT_FONT_SCALE_INDEX;
  }
}

