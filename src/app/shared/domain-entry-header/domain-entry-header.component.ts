import { Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DomainName } from '../../features/catalog-detail/models/domain-sheet-config';

@Component({
  selector: 'app-domain-entry-header',
  imports: [TranslocoPipe],
  templateUrl: './domain-entry-header.component.html',
  styleUrl: './domain-entry-header.component.css',
})
export class DomainEntryHeaderComponent {
  readonly domain = input.required<DomainName>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly status = input<string | null>(null);
  readonly showContext = input(true);
  readonly compact = input(false);
  readonly useProjectedLabel = input(false);
}