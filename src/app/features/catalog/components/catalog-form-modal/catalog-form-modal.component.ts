import { Component, effect, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { CatalogItem } from '../../models/catalog-item.model';

@Component({
  selector: 'app-catalog-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslocoPipe],
  templateUrl: './catalog-form-modal.component.html', // Fixed to templateUrl path
  styleUrls: ['./catalog-form-modal.component.css'],  // Fixed to styleUrls array path
})
export class CatalogFormModalComponent {
  private fb = inject(FormBuilder);

  readonly editItem = input<CatalogItem | null>(null);

  readonly save = output<{
    item: Omit<CatalogItem, 'updatedAt' | 'syncStatus'>;
    isEdit: boolean;
  }>();
  readonly close = output<void>();

  // 1. Updated FormControls to match the new schema properties
  form = this.fb.group({
    id: ['', [Validators.required, Validators.maxLength(100)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    sheetId: [''],
    subject: ['', Validators.required],
    topic: ['', Validators.required],
    author: ['', Validators.required],
    description: [''],
    source: [''],
    active: [true],
  });

  constructor() {
    effect(() => {
      const item = this.editItem();
      if (item) {
        // 2. Map existing payload keys to the reactive controls
        this.form.patchValue({
          id: item.id,
          name: item.name,
          subject: item.subject,
          topic: item.topic,
          author: item.author,
          description: item.description || '',
          source: item.source || '',
          active: item.active,
        });
      } else {
        // Reset defaults when adding a brand new item
        this.form.reset({
          id: '',
          name: '',
          sheetId: '',
          subject: '',
          topic: '',
          author: '',
          description: '',
          source: '',
          active: true,
        });
      }
    });
  }

  sanitizeSheetId(): void {
    const raw = this.form.get('sheetId')?.value || '';
    const match = raw.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      this.form.patchValue({ sheetId: match[1] });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.sanitizeSheetId();

    const formValue = this.form.getRawValue();
    const existing = this.editItem();
    const nextId = String(formValue.id ?? '').trim();

    // 3. Construct payload aligning perfectly with the updated Omit contract
    const payload: Omit<CatalogItem, 'updatedAt' | 'syncStatus'> = {
      id: nextId || (existing ? existing.id : 'cat-' + Date.now().toString(36)),
      name: formValue.name!,
      subject: formValue.subject!,
      topic: formValue.topic!,
      author: formValue.author!,
      description: formValue.description || '',
      source: formValue.source || '',
      active: !!formValue.active,
      row: existing ? existing.row : 0,
    };

    this.save.emit({
      item: payload,
      isEdit: !!existing,
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close.emit();
    }
  }
}
