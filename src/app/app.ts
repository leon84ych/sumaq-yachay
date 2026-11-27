import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobalMessageService } from './core/services/global-message.service';
import { GlobalLoadingComponent } from './core/components/global-loading/global-loading.component';
import { GlobalMessageComponent } from './core/components/global-message/global-message.component';
import { SettingsPanelComponent } from './core/components/settings-panel/settings-panel.component';
import { SyncComponent } from './core/components/sync/sync.component';
import { LoginComponent } from './features/authentication/components/login/login.component';
import { DomainWriteSyncService, PassageWriteSyncService } from './features/domain/shared/domain-repository/domain-write-sync.service';
import { AllDomainWriteSyncService } from './features/domain/shared/domain-repository/all-domain-write-sync.service';

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
      GlobalMessageComponent,
    SyncComponent,
    SettingsPanelComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly globalMessageService = inject(GlobalMessageService);

  constructor() {
    inject(DomainWriteSyncService);
    inject(PassageWriteSyncService);
    inject(AllDomainWriteSyncService);
  }
}
