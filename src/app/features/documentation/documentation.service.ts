import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { marked } from 'marked';
import { map } from 'rxjs';

export type ManualLanguage = 'en' | 'es';

export interface ManualEntry {
  file: string;
  title: string;
  order: number;
}

@Injectable({ providedIn: 'root' })
export class DocumentationService {
  private readonly http = inject(HttpClient);

  entries(language: ManualLanguage) {
    return this.http.get<Record<ManualLanguage, string[]>>('docs/manuals.json').pipe(
      map((index) =>
        (index[language] ?? [])
          .filter((file) => /^\d+_[^/\\]+\.md$/.test(file))
          .map((file): ManualEntry => ({
            file,
            title: file.replace(/^\d+_/, '').replace(/\.md$/, '').replace(/_/g, ' '),
            order: Number(file.split('_')[0]),
          }))
          .sort((first, second) => first.order - second.order || first.file.localeCompare(second.file)),
      ),
    );
  }

  document(language: ManualLanguage, file: string) {
    return this.http
      .get(`docs/${language}/manual/${encodeURIComponent(file)}`, { responseType: 'text' })
      .pipe(map((markdown) => marked.parse(markdown, { async: false })));
  }
}