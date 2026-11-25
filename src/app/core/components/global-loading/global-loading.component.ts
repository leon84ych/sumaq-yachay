import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobalLoadingService } from '../../services/loading/global-loading.service';

@Component({
  selector: 'app-global-loading',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './global-loading.component.html',
  styleUrl: './global-loading.component.css',
})
export class GlobalLoadingComponent {
  readonly loadingService = inject(GlobalLoadingService);
  readonly loadingDialog = viewChild<ElementRef<HTMLDialogElement>>('loadingDialog');

  constructor() {
    effect(() => {
      const isLoading = this.loadingService.isLoading();
      const dialog = this.loadingDialog()?.nativeElement;
      if (!dialog) {
        return;
      }

      if (isLoading && !dialog.open) {
        dialog.showModal();
      } else if (!isLoading && dialog.open) {
        dialog.close();
      }
    });
  }
}
