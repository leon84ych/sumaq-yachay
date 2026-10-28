import { Component, ViewEncapsulation, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subject, catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';
import { DocumentationService, ManualEntry, ManualLanguage } from './documentation.service';

interface DocumentationState {
  language: ManualLanguage;
  entries: ManualEntry[];
  selected: ManualEntry | null;
  html: string;
  loading: boolean;
  error: boolean;
  missing: boolean;
}

@Component({
  selector: 'app-documentation',
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './documentation.component.html',
  styleUrl: './documentation.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class DocumentationComponent {
  private readonly documentation = inject(DocumentationService);
  private readonly transloco = inject(TranslocoService);
  private readonly route = inject(ActivatedRoute);
  private readonly reload = new Subject<void>();

  private readonly initial: DocumentationState = {
    language: 'en', entries: [], selected: null, html: '',
    loading: true, error: false, missing: false,
  };

  readonly state = toSignal(
    combineLatest([
      this.transloco.langChanges$,
      this.route.paramMap,
      this.reload.pipe(startWith(undefined)),
    ]).pipe(
      switchMap(([activeLanguage, params]) => {
        const language: ManualLanguage = activeLanguage === 'es' ? 'es' : 'en';
        const pending = { ...this.initial, language };
        return this.documentation.entries(language).pipe(
          switchMap((entries) => {
            const page = params.get('manual');
            const selected = page === null
              ? entries[0] ?? null
              : entries.find((entry) => /^\d+$/.test(page) && entry.order === Number(page)) ?? null;
            const base = { ...pending, entries, selected, loading: false };
            if (!selected) return of({ ...base, missing: entries.length > 0 });
            return this.documentation.document(language, selected.file).pipe(
              map((html) => ({ ...base, html })),
              catchError(() => of({ ...base, error: true })),
              startWith({ ...base, loading: true }),
            );
          }),
          catchError(() => of({ ...pending, loading: false, error: true })),
          startWith(pending),
        );
      }),
    ),
    { initialValue: this.initial },
  );

  retry(): void {
    this.reload.next();
  }
}