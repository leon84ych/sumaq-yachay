import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-domain-entry-form-overlay',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './domain-entry-form-overlay.component.html',
  styleUrl: './domain-entry-form-overlay.component.css',
})
export class DomainEntryFormOverlayComponent implements OnDestroy {
  readonly ariaLabel = input.required<string>();
  readonly closeRequested = output<void>();

  @ViewChild('dialog') private dialog?: ElementRef<HTMLDialogElement>;

  private readonly document = inject(DOCUMENT);
  private readonly scrollY = this.document.defaultView?.scrollY ?? 0;
  private readonly previousFocus = this.document.activeElement as HTMLElement | null;

  constructor() {
    afterNextRender(() => {
      const dialog = this.dialog?.nativeElement;
      if (!dialog || dialog.open) {
        return;
      }

      dialog.showModal();
      dialog
        .querySelector<HTMLElement>(
          '.add-entry-form input:not([type="hidden"]), .add-entry-form select, .add-entry-form textarea, .add-entry-form button',
        )
        ?.focus({ preventScroll: true });
    });
  }

  requestClose(event?: Event): void {
    event?.preventDefault();
    this.closeRequested.emit();
  }

  closeOnBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog?.nativeElement) {
      this.closeRequested.emit();
    }
  }

  ngOnDestroy(): void {
    const view = this.document.defaultView;
    if (!view) {
      return;
    }

    view.requestAnimationFrame(() => {
      view.scrollTo(0, this.scrollY);
      if (this.previousFocus?.isConnected) {
        this.previousFocus.focus({ preventScroll: true });
      }
    });
  }
}
