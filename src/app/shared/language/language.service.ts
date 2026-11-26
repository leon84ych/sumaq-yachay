import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { liveQuery } from 'dexie';
import { LocalDBService } from '../local-db/local-db.service';

export const DEFAULT_LANGUAGE_NAMES = [
  ['Arabic', 'Árabe'],
  ['Bengali', 'Bengalí'],
  ['English', 'Inglés'],
  ['French', 'Francés'],
  ['German', 'Alemán'],
  ['Hindi', 'Hindi'],
  ['Indonesian', 'Indonesio'],
  ['Italian', 'Italiano'],
  ['Japanese', 'Japonés'],
  ['Korean', 'Coreano'],
  ['Mandarin Chinese', 'Chino mandarín'],
  ['Persian', 'Persa'],
  ['Portuguese', 'Portugués'],
  ['Russian', 'Ruso'],
  ['Spanish', 'Español'],
  ['Swahili', 'Suajili'],
  ['Tamil', 'Tamil'],
  ['Turkish', 'Turco'],
  ['Urdu', 'Urdu'],
  ['Vietnamese', 'Vietnamita'],
] as const;

export const DEFAULT_LANGUAGES = [...new Set(DEFAULT_LANGUAGE_NAMES.flat())];

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly database = inject(LocalDBService).indexedDB;
  readonly languages = signal<string[]>([...DEFAULT_LANGUAGES]);

  constructor() {
    const subscription = liveQuery(async () => {
      const [books, glossary, languages] = await Promise.all([
        this.database.books.toArray(),
        this.database.glossary.toArray(),
        this.database.languages.toArray(),
      ]);
      return [...DEFAULT_LANGUAGES, ...languages.map(language => language.name),
        ...books.map(book => book.language), ...glossary.map(entry => entry.language)];
    }).subscribe({
      next: values => void this.collect(values).catch(error => console.error('Failed to store languages:', error)),
      error: error => console.error('Failed to load languages:', error),
    });
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  async remember(value: string): Promise<void> {
    try {
      await this.collect([...DEFAULT_LANGUAGES, value]);
    } catch (error) {
      console.error('Failed to store languages:', error);
    }
  }

  private async collect(values: (string | undefined)[]): Promise<void> {
    const table = this.database.languages;
    const names = await this.database.transaction('rw', table, async () => {
      const stored = await table.toArray();
      const byKey = new Map(stored.map(language => [language.key, language.name]));
      for (const value of values) {
        const name = typeof value === 'string' ? value.trim() : '';
        if (!name) continue;
        const key = name.toLowerCase();
        if (!byKey.has(key)) byKey.set(key, name);
      }
      const added = [...byKey].filter(([key]) => !stored.some(language => language.key === key));
      if (added.length) await table.bulkPut(added.map(([key, name]) => ({ key, name })));
      return [...byKey.values()].sort((first, second) => first.localeCompare(second));
    });
    this.languages.set(names);
  }
}