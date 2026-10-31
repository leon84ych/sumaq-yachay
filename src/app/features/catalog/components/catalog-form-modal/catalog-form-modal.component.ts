import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { CatalogItem } from '../../models/catalog-item.model';
import { PermissionService } from '../../../../core/services/permission.service';

@Component({
  selector: 'app-catalog-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslocoPipe],
  templateUrl: './catalog-form-modal.component.html', // Fixed to templateUrl path
  styleUrls: ['./catalog-form-modal.component.css'], // Fixed to styleUrls array path
})
export class CatalogFormModalComponent {
  private fb = inject(FormBuilder);
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;

  readonly editItem = input<CatalogItem | null>(null);
  readonly isLoading = input(false);
  readonly error = input<string | null>(null);
  readonly registrationMode = signal<'manual' | 'url'>('manual');
  readonly isUrlMode = computed(() => !this.editItem() && this.registrationMode() === 'url');
  readonly clone = output<string>();

  readonly save = output<{
    item: Omit<CatalogItem, 'updatedAt' | 'syncStatus'>;
    isEdit: boolean;
  }>();
  readonly close = output<void>();

  // 1. Updated FormControls to match the new schema properties
  form = this.fb.group({
    id: ['', [Validators.required, Validators.maxLength(100)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    subject: ['', Validators.required],
    topic: ['', Validators.required],
    author: ['', Validators.required],
    page: [0],
    pages: [0],
    description: [''],
    source: [''],
    active: [true],
  });

  readonly urlForm = this.fb.nonNullable.group({
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

  constructor() {
    effect(() => {
      const item = this.editItem();
      this.registrationMode.set('manual');
      this.urlForm.reset({ sheetUrl: '' });
      if (item) {
        this.form.get('id')?.disable();
        // 2. Map existing payload keys to the reactive controls
        this.form.patchValue({
          id: item.id,
          name: item.name,
          subject: item.subject,
          topic: item.topic,
          author: item.author,
          page: item.page ?? 0,
          pages: item.pages ?? 0,
          description: item.description || '',
          source: item.source || '',
          active: item.active,
        });
      } else {
        this.form.get('id')?.enable();
        // Reset defaults when adding a brand new item
        this.form.reset({
          id: '',
          name: '',
          subject: '',
          topic: '',
          author: '',
          page: 0,
          pages: 0,
          description: '',
          source: '',
          active: true,
        });
      }
    });
  }

  onSubmit(): void {
    if (this.isLoading()) return;
    if (this.isUrlMode()) {
      this.urlForm.markAllAsTouched();
      if (this.urlForm.invalid) return;
      this.clone.emit(this.urlForm.controls.sheetUrl.value.trim());
      return;
    }
    if (this.form.invalid) return;

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
      page: formValue.page ?? 0,
      pages: formValue.pages ?? 0,
      count: 0,
    };

    this.save.emit({
      item: payload,
      isEdit: !!existing,
    });
  }

  setRegistrationMode(mode: 'manual' | 'url'): void {
    if (!this.isLoading() && !this.editItem()) this.registrationMode.set(mode);
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.isLoading()) return;
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close.emit();
    }
  }
}
