import { Component, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../core/services/permission.service';
import { DomainEntryCardComponent } from '../../../../shared/domain-entry-card/domain-entry-card.component';
import { GlossaryRow } from '../../model/domain-glosary-row.model';

@Component({
  selector: 'app-glossary-entry-card',
  imports: [TranslocoPipe, DomainEntryCardComponent],
  templateUrl: './glossary-entry-card.component.html',
  styleUrl: './glossary-entry-card.component.css',
})
export class GlossaryEntryCardComponent {
  private readonly permissionService = inject(PermissionService);

  readonly row = input.required<GlossaryRow>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly showActions = input(true);
  readonly showContext = input(false);
  readonly deleteRequested = output<string>();
  readonly editRequested = output<GlossaryRow>();
  readonly role = this.permissionService.role;
  readonly permissions = this.permissionService;

  splitTags(tags: string | undefined): string[] {
    return (tags ?? '')
      .split(/[\s,;]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
}