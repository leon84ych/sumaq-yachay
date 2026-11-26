import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LanguageService } from './language.service';

@Component({
  selector: 'app-language-selector',
  imports: [TranslocoPipe],
  template: `
    <div class="language-selector">
      <div class="language-field">
        <input #languageInput [id]="inputId()" type="text" role="combobox" autocomplete="off"
          [value]="value()" [placeholder]="placeholder()" [required]="required()"
          [attr.aria-invalid]="invalid() ? 'true' : null"
          [attr.aria-expanded]="open()" [attr.aria-controls]="inputId() + '-options'"
          [attr.aria-activedescendant]="activeIndex() >= 0 ? inputId() + '-option-' + activeIndex() : null"
          aria-autocomplete="list" (focus)="showAll()" (click)="reopen()" (input)="onInput($event)"
          (keydown)="onKeydown($event)" (blur)="onBlur()" />
        <button type="button" class="toggle" [attr.aria-label]="'COMMON.SHOW_LANGUAGES' | transloco"
          [attr.aria-expanded]="open()" [attr.aria-controls]="inputId() + '-options'"
          (mousedown)="$event.preventDefault()" (click)="toggle(languageInput)"><span aria-hidden="true"></span></button>
      </div>
      @if (open() && filtered().length) {
        <div class="options" role="listbox" [id]="inputId() + '-options'">
          @for (language of filtered(); track language; let index = $index) {
            <button type="button" role="option" tabindex="-1"
              [id]="inputId() + '-option-' + index" [attr.aria-selected]="index === activeIndex()"
              (mousedown)="$event.preventDefault()" (click)="select(language)">{{ language }}</button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .language-selector { position: relative; }
    .language-field { display: flex; border: 1px solid var(--border, #b6c1c4); border-radius: 4px; background: var(--background, #fff); }
    .language-field:focus-within { outline: 2px solid var(--border-focus, #377887); outline-offset: 1px; }
    input { min-width: 0; width: 100%; padding: 0.6rem 0.85rem; border: 0; outline: 0; background: transparent; color: var(--text, #222); font: inherit; }
    .toggle { flex: 0 0 2.5rem; border: 0; background: transparent; cursor: pointer; color: var(--text, #222); }
    .toggle span { display: inline-block; border: 5px solid transparent; border-top-color: currentColor; transform: translateY(3px); }
    .options { position: absolute; z-index: 20; top: calc(100% + 2px); width: 100%; max-height: 12rem; overflow-y: auto; border: 1px solid var(--border, #b6c1c4); border-radius: 4px; background: var(--surface, #fff); box-shadow: 0 4px 12px #0002; }
    .options button { display: block; width: 100%; padding: 0.5rem 0.85rem; border: 0; background: transparent; color: var(--text, #222); text-align: left; font: inherit; cursor: pointer; }
    .options button:hover, .options button[aria-selected='true'] { background: var(--primary-light, #e6f0f0); }
  `],
})
export class LanguageSelectorComponent {
  readonly inputId = input.required<string>();
  readonly value = input('');
  readonly placeholder = input('');
  readonly required = input(false);
  readonly invalid = input(false);
  readonly valueChange = output<string>();
  readonly blurred = output<void>();
  readonly open = signal(false);
  readonly activeIndex = signal(-1);
  private readonly query = signal('');
  private readonly languageService = inject(LanguageService);
  readonly filtered = computed(() => {
    const query = this.normalize(this.query());
    return this.languageService.languages().filter(language => this.normalize(language).includes(query));
  });

  showAll(): void {
    this.query.set('');
    this.activeIndex.set(-1);
    this.open.set(true);
  }

  reopen(): void {
    if (!this.open()) this.showAll();
  }

  toggle(inputElement: HTMLInputElement): void {
    if (this.open()) {
      this.open.set(false);
    } else {
      this.showAll();
      inputElement.focus();
    }
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.valueChange.emit(value);
    this.query.set(value);
    this.activeIndex.set(-1);
    this.open.set(true);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.open.set(true);
      const count = this.filtered().length;
      if (count) {
        const next = event.key === 'ArrowDown' ? this.activeIndex() + 1 : this.activeIndex() < 0 ? count - 1 : this.activeIndex() - 1;
        this.activeIndex.set((next + count) % count);
        const inputElement = event.currentTarget as HTMLInputElement;
        requestAnimationFrame(() => {
          const options = inputElement.closest('.language-selector')?.querySelectorAll<HTMLElement>('[role="option"]');
          options?.[this.activeIndex()]?.scrollIntoView?.({ block: 'nearest' });
        });
      }
    } else if (event.key === 'Enter' && this.open() && this.activeIndex() >= 0) {
      event.preventDefault();
      this.select(this.filtered()[this.activeIndex()]);
    } else if (event.key === 'Escape' && this.open()) {
      event.preventDefault();
      event.stopPropagation();
      this.open.set(false);
    }
  }

  onBlur(): void {
    this.open.set(false);
    this.blurred.emit();
  }

  select(language: string): void {
    this.valueChange.emit(language);
    this.open.set(false);
    this.activeIndex.set(-1);
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}