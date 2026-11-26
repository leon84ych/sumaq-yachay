import { Component, effect, inject, input } from '@angular/core';
import { GlobalMessageService } from '../../services/global-message.service';

@Component({
  selector: 'app-global-message',
  standalone: true,
  imports: [],
  templateUrl: './global-message.component.html',
  styleUrls: ['./global-message.component.css'],
})
export class GlobalMessageComponent {
  readonly durationMs = input(10_000);
  readonly globalMessageService = inject(GlobalMessageService);
  readonly message = this.globalMessageService.message;

  constructor() {
    effect((onCleanup) => {
      const currentMessage = this.message();
      if (!currentMessage) return;

      const timeout = setTimeout(
        () => this.globalMessageService.clear(),
        Math.max(0, this.durationMs()),
      );
      onCleanup(() => clearTimeout(timeout));
    });
  }
}