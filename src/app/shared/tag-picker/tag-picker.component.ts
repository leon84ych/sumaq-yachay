import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AppDbService, BookTag } from '../../core/services/storage/app-db.service';
import { normalizeTags } from '../utils/tag-utils';

@Component({
  selector: 'app-tag-picker',
  standalone: true,
  imports: [CommonModule, TranslocoPipe],
  templateUrl: './tag-picker.component.html',
  styleUrl: './tag-picker.component.css',
})
export class TagPickerComponent {
  readonly value = model<string[]>([]);
  readonly bookRow = input<number | null>(null);
  readonly ariaLabel = input.required<string>();
  readonly inputId = input('');

  readonly inputValue = signal('');
  readonly isFocused = signal(false);
  readonly suggestions = signal<BookTag[]>([]);
  readonly selectedTags = computed(() => normalizeTags(this.value()));
  readonly matchingSuggestions = computed(() => {
    const query = this.inputValue().trim().toLocaleLowerCase();
    const selected = new Set(this.selectedTags().map((tag) => tag.toLocaleLowerCase()));

    return this.suggestions()
      .filter((suggestion) => {
        const tag = suggestion.name.toLocaleLowerCase();
        return !selected.has(tag) && (!query || tag.includes(query));
      })
      .slice(0, 8);
  });

  private readonly dbService = inject(AppDbService);

  constructor() {
    effect((onCleanup) => {
      const row = this.bookRow();
      let active = true;

      if (row === null) {
        this.suggestions.set([]);
        return;
      }

      void this.dbService.db.bookTags
        .where('row')
        .equals(row)
        .toArray()
        .then((tags) => {
          if (active) {
            this.suggestions.set(
              tags.sort((left, right) => (right.usageCount ?? 0) - (left.usageCount ?? 0)),
            );
          }
        })
        .catch(() => {
          if (active) {
            this.suggestions.set([]);
          }
        });

      onCleanup(() => {
        active = false;
      });
    });
  }

  onInput(value: string): void {
    this.inputValue.set(value);
    if (/[\s,;]$/.test(value)) {
      this.addTag(value);
    }
  }

  onInputBlur(): void {
    this.addTag(this.inputValue());
    this.isFocused.set(false);
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTag(this.inputValue());
    } else if (event.key === 'Backspace' && !this.inputValue() && this.selectedTags().length) {
      this.removeTag(this.selectedTags()[this.selectedTags().length - 1]);
    }
  }

  addTag(tag: string): void {
    const incomingTags = normalizeTags(tag.split(/[\s,;]+/));
    if (incomingTags.length === 0) {
      this.inputValue.set('');
      return;
    }

    this.value.set(normalizeTags([...this.selectedTags(), ...incomingTags]));
    this.inputValue.set('');
  }

  removeTag(tagToRemove: string): void {
    this.value.set(normalizeTags(this.selectedTags().filter((tag) => tag !== tagToRemove)));
  }

  setFocused(focused: boolean): void {
    this.isFocused.set(focused);
  }

}
