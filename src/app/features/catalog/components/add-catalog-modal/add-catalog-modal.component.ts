import { Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';

export interface AddCatalogEvent {
  sheetUrl: string;
}

@Component({
  selector: 'app-add-catalog-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './add-catalog-modal.component.html',
  styleUrl: './add-catalog-modal.component.css',
})
export class AddCatalogModalComponent {
  private readonly fb = inject(FormBuilder);

  readonly isLoading = input(false);
  readonly error = input<string | null>(null);
  readonly close = output<void>();
  readonly add = output<AddCatalogEvent>();

  readonly form = this.fb.nonNullable.group({
    sheetUrl: [
      '',
      [
        Validators.required,
        Validators.pattern(
          /^https:\/\/docs\.google\.com\/spreadsheets\/(?:u\/\d+\/)?d\/[A-Za-z0-9_-]+(?:\/.*)?$/,
        ),
      ],
    ],
  });

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isLoading()) return;

    const formValue = this.form.getRawValue();
    this.add.emit({
      sheetUrl: formValue.sheetUrl.trim(),
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.isLoading()) return;
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close.emit();
    }
  }
}