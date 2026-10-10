import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobalErrorService } from './core/services/global-error.service';
import { GlobalLoadingComponent } from './core/components/global-loading/global-loading.component';
import { SettingsPanelComponent } from './core/components/settings-panel/settings-panel.component';
import { LoginComponent } from './features/authentication/components/login/login.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslocoPipe,
    LoginComponent,
    GlobalLoadingComponent,
    SettingsPanelComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly globalErrorService = inject(GlobalErrorService);
}
