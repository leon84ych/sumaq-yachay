import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslocoPipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly translocoService = inject(TranslocoService);
  protected readonly title = signal('sumaq-yachay');

  constructor() {
    const savedLang = localStorage.getItem('sumaq_yachay_lang');
    if (savedLang && (savedLang === 'en' || savedLang === 'es')) {
      this.translocoService.setActiveLang(savedLang);
    }
  }

  setLanguage(lang: 'en' | 'es'): void {
    this.translocoService.setActiveLang(lang);
    localStorage.setItem('sumaq_yachay_lang', lang);
  }

  getActiveLang(): string {
    return this.translocoService.getActiveLang();
  }
}
