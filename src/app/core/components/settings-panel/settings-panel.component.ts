import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
    ConfigService,
    GAS_TIMEOUT_OPTIONS,
    GasTimeoutMs,
} from '../../services/config.service';
import { AppDbService } from '../../services/storage/app-db.service';

const THEME_KEY = 'sumaq_yachay_theme';
const FONT_SCALE_KEY = 'sumaq_yachay_font_scale';
type Theme = 'light' | 'dark';

const FONT_SCALE_STEPS = [87.5, 100, 112.5, 125, 137.5];
const DEFAULT_FONT_SCALE_INDEX = 1;

@Component({
    selector: 'app-settings-panel',
    imports: [FormsModule, TranslocoPipe],
    templateUrl: './settings-panel.component.html',
    styleUrl: './settings-panel.component.css',
})
export class SettingsPanelComponent {
    readonly translocoService = inject(TranslocoService);
    private readonly configService = inject(ConfigService);
    private readonly appDbService = inject(AppDbService);

    readonly showSettings = signal(false);
    readonly apiUrlInput = signal(this.configService.getWebAppUrl());
    readonly gasTimeoutInput = signal<GasTimeoutMs>(
        this.configService.getGasTimeoutMs() as GasTimeoutMs,
    );
    readonly gasTimeoutOptions = GAS_TIMEOUT_OPTIONS;
    readonly localFirstEnabled = this.configService.localFirstEnabled;
    readonly isClearing = signal(false);
    readonly clearStatus = signal<string | null>(null);

    readonly theme = signal<Theme>(this.loadInitialTheme());
    readonly fontScaleIndex = signal(this.loadInitialFontScaleIndex());
    readonly fontScale = computed(() => FONT_SCALE_STEPS[this.fontScaleIndex()]);
    readonly isMinFontScale = computed(() => this.fontScaleIndex() === 0);
    readonly isMaxFontScale = computed(() => this.fontScaleIndex() === FONT_SCALE_STEPS.length - 1);

    constructor() {
        const savedLang = localStorage.getItem('sumaq_yachay_lang');
        if (savedLang === 'en' || savedLang === 'es') {
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

    saveApiConfig(): void {
        this.configService.setWebAppUrl(this.apiUrlInput());
        this.configService.setGasTimeoutMs(this.gasTimeoutInput());
        this.showSettings.set(false);
    }

    setLocalFirstEnabled(enabled: boolean): void {
        this.configService.setLocalFirstEnabled(enabled);
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

    async clearLocalDatabase(): Promise<void> {
        if (this.isClearing()) {
            return;
        }

        const warning = this.translocoService.translate('NAV.SETTINGS.CLEAR_CONFIRMATION');
        if (!window.confirm(warning)) {
            return;
        }

        this.isClearing.set(true);
        this.clearStatus.set(null);
        try {
            await this.appDbService.clearAllTables();
            this.clearStatus.set('NAV.SETTINGS.CLEAR_SUCCESS');
        } catch {
            this.clearStatus.set('NAV.SETTINGS.CLEAR_ERROR');
        } finally {
            this.isClearing.set(false);
        }
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
            // localStorage unavailable; use system preference
        }
        const prefersDark =
            typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
    }

    private loadInitialFontScaleIndex(): number {
        try {
            const stored = Number(localStorage.getItem(FONT_SCALE_KEY));
            if (Number.isInteger(stored) && stored >= 0 && stored < FONT_SCALE_STEPS.length) {
                return stored;
            }
        } catch {
            // localStorage unavailable; use the default scale
        }
        return DEFAULT_FONT_SCALE_INDEX;
    }
}