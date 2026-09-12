import { Component, effect, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { CatalogCategory, CatalogItem, CatalogType } from '../../models/catalog-item.model';

@Component({
  selector: 'app-catalog-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslocoPipe],
  template: `
    <div class="modal-overlay" (click)="onBackdropClick($event)">
      <div class="modal-dialog">
        <div class="modal-header">
          <h2>{{ (editItem() ? 'CATALOG.MODAL.TITLE_EDIT' : 'CATALOG.MODAL.TITLE_CREATE') | transloco }}</h2>
          <button type="button" class="btn-close" (click)="close.emit()">✕</button>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="modal-form">
          <!-- Name Field -->
          <div class="form-group">
            <label for="name">{{ 'CATALOG.MODAL.NAME_LABEL' | transloco }} <span class="required">*</span></label>
            <input
              id="name"
              type="text"
              formControlName="name"
              [placeholder]="'CATALOG.MODAL.NAME_PLACEHOLDER' | transloco"
              class="form-control"
            />
            @if (form.get('name')?.touched && form.get('name')?.invalid) {
              <span class="field-error">{{ 'CATALOG.MODAL.NAME_ERROR' | transloco }}</span>
            }
          </div>

          <!-- Sheet ID / URL Field -->
          <div class="form-group">
            <label for="sheetId">{{ 'CATALOG.MODAL.SHEET_LABEL' | transloco }} <span class="required">*</span></label>
            <input
              id="sheetId"
              type="text"
              formControlName="sheetId"
              [placeholder]="'CATALOG.MODAL.SHEET_PLACEHOLDER' | transloco"
              (blur)="sanitizeSheetId()"
              class="form-control"
            />
            <small class="field-hint">{{ 'CATALOG.MODAL.SHEET_HINT' | transloco }}</small>
            @if (form.get('sheetId')?.touched && form.get('sheetId')?.invalid) {
              <span class="field-error">{{ 'CATALOG.MODAL.SHEET_ERROR' | transloco }}</span>
            }
          </div>

          <!-- Category & Type Row -->
          <div class="form-row">
            <div class="form-group flex-1">
              <label for="category">{{ 'CATALOG.MODAL.CATEGORY_LABEL' | transloco }} <span class="required">*</span></label>
              <select id="category" formControlName="category" class="form-control">
                <option value="Technical">{{ 'CATALOG.FILTER.TECHNICAL' | transloco }}</option>
                <option value="Philosophy">{{ 'CATALOG.FILTER.PHILOSOPHY' | transloco }}</option>
                <option value="Fiction">{{ 'CATALOG.FILTER.FICTION' | transloco }}</option>
              </select>
            </div>

            <div class="form-group flex-1">
              <label for="type">{{ 'CATALOG.MODAL.TYPE_LABEL' | transloco }} <span class="required">*</span></label>
              <select id="type" formControlName="type" class="form-control">
                <option value="entities">{{ 'CATALOG.MODAL.TYPES.ENTITIES' | transloco }}</option>
                <option value="relations">{{ 'CATALOG.MODAL.TYPES.RELATIONS' | transloco }}</option>
                <option value="excerpts">{{ 'CATALOG.MODAL.TYPES.EXCERPTS' | transloco }}</option>
                <option value="timelines">{{ 'CATALOG.MODAL.TYPES.TIMELINES' | transloco }}</option>
                <option value="scenarios">{{ 'CATALOG.MODAL.TYPES.SCENARIOS' | transloco }}</option>
              </select>
            </div>
          </div>

          <!-- Description Field -->
          <div class="form-group">
            <label for="description">{{ 'CATALOG.MODAL.DESCRIPTION_LABEL' | transloco }}</label>
            <textarea
              id="description"
              formControlName="description"
              rows="3"
              [placeholder]="'CATALOG.MODAL.DESCRIPTION_PLACEHOLDER' | transloco"
              class="form-control"
            ></textarea>
          </div>

          <!-- Active Checkbox -->
          <div class="form-group-checkbox">
            <label class="checkbox-label">
              <input type="checkbox" formControlName="active" />
              <span>{{ 'CATALOG.MODAL.ACTIVE_LABEL' | transloco }}</span>
            </label>
          </div>

          <!-- Modal Actions -->
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="close.emit()">
              {{ 'CATALOG.MODAL.CANCEL' | transloco }}
            </button>
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid">
              {{ (editItem() ? 'CATALOG.MODAL.SUBMIT_EDIT' : 'CATALOG.MODAL.SUBMIT_CREATE') | transloco }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(34, 49, 58, 0.45);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-dialog {
      background: var(--surface);
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 540px;
      box-shadow: var(--shadow-lg);
      border: 1px solid var(--border);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes popIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
      background-color: var(--primary-light);
    }

    .modal-header h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--primary);
      margin: 0;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 1.2rem;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px 8px;
      border-radius: var(--radius-sm);
    }

    .btn-close:hover {
      background: rgba(0, 0, 0, 0.05);
      color: var(--text);
    }

    .modal-form {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-row {
      display: flex;
      gap: 1rem;
    }

    .flex-1 {
      flex: 1;
    }

    label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text);
    }

    .required {
      color: var(--error);
    }

    .form-control {
      padding: 0.6rem 0.85rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 0.95rem;
      background: var(--background);
      color: var(--text);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(31, 85, 99, 0.15);
      background: var(--surface);
    }

    textarea.form-control {
      resize: vertical;
    }

    .field-hint {
      font-size: 0.775rem;
      color: var(--text-muted);
    }

    .field-error {
      font-size: 0.775rem;
      color: var(--error);
      font-weight: 500;
    }

    .form-group-checkbox {
      margin-top: 0.25rem;
    }

    .checkbox-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
    }

    .checkbox-label input[type="checkbox"] {
      accent-color: var(--primary);
      width: 17px;
      height: 17px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }

    .btn {
      padding: 0.6rem 1.25rem;
      font-size: 0.9rem;
      font-weight: 600;
      border-radius: var(--radius-sm);
      cursor: pointer;
      border: none;
      transition: background-color 0.15s ease;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: var(--background);
      color: var(--text);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover:not(:disabled) {
      background: #eaefed;
    }

    .btn-primary {
      background: var(--primary);
      color: #ffffff;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--primary-hover);
    }
  `],
})
export class CatalogFormModalComponent {
  private fb = inject(FormBuilder);

  readonly editItem = input<CatalogItem | null>(null);

  readonly save = output<{
    item: Omit<CatalogItem, 'updatedAt' | 'syncStatus'>;
    isEdit: boolean;
  }>();
  readonly close = output<void>();

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    sheetId: ['', Validators.required],
    category: ['Technical' as CatalogCategory, Validators.required],
    type: ['entities' as CatalogType, Validators.required],
    description: [''],
    active: [true],
  });

  constructor() {
    effect(() => {
      const item = this.editItem();
      if (item) {
        this.form.patchValue({
          name: item.name,
          sheetId: item.sheetId,
          category: item.category,
          type: item.type,
          description: item.description || '',
          active: item.active,
        });
      } else {
        this.form.reset({
          name: '',
          sheetId: '',
          category: 'Technical',
          type: 'entities',
          description: '',
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

    const payload: Omit<CatalogItem, 'updatedAt' | 'syncStatus'> = {
      id: existing ? existing.id : 'cat-' + Date.now().toString(36),
      name: formValue.name!,
      sheetId: formValue.sheetId!,
      category: formValue.category as CatalogCategory,
      type: formValue.type as CatalogType,
      description: formValue.description || '',
      active: !!formValue.active,
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
