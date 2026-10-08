import { Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobalLoadingService } from '../../services/global-loading.service';

@Component({
  selector: 'app-global-loading',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './global-loading.component.html',
  styleUrl: './global-loading.component.css',
})
export class GlobalLoadingComponent {
  readonly loadingService = inject(GlobalLoadingService);
}
