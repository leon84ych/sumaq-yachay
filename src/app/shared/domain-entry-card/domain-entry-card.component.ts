import { Component, input } from '@angular/core';
import { DomainName } from '../../features/catalog-detail/models/domain-sheet-config';
import { DomainEntryHeaderComponent } from '../domain-entry-header/domain-entry-header.component';

@Component({
  selector: 'app-domain-entry-card',
  imports: [DomainEntryHeaderComponent],
  templateUrl: './domain-entry-card.component.html',
  styleUrl: './domain-entry-card.component.css',
})
export class DomainEntryCardComponent {
  readonly domain = input.required<DomainName>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly title = input.required<string>();
  readonly note = input('');
  readonly accentColor = input<string | null>(null);
  readonly showContext = input(true);
  readonly status = input<string | null>(null);
}
