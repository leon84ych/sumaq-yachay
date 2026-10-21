import { Component, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../core/services/permission.service';
import { DomainEntryCardComponent } from '../../../../shared/domain-entry-card/domain-entry-card.component';
import { parseTags } from '../../../../shared/utils/tag-utils';
import { ConceptQuizGeneratorComponent } from '../../concept-quiz/concept-quiz.component';
import { ConceptRow } from '../../model/domain-concept-row.model';

const NODE_CATEGORIES = [
  'theory-model',
  'phenomenon-process',
  'principle-axiom',
  'paradigm-school',
  'technical-construct',
  'other',
] as const;

@Component({
  selector: 'app-concept-entry-card',
  imports: [TranslocoPipe, DomainEntryCardComponent, ConceptQuizGeneratorComponent],
  templateUrl: './concept-entry-card.component.html',
  styleUrl: './concept-entry-card.component.css',
})
export class ConceptEntryCardComponent {
  private readonly permissionService = inject(PermissionService);

  readonly row = input.required<ConceptRow>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly bookRow = input.required<number>();
  readonly sourceDomain = input('CONCEPTS');
  readonly showActions = input(true);
  readonly showContext = input(false);
  readonly deleteRequested = output<string>();
  readonly editRequested = output<ConceptRow>();
  readonly role = this.permissionService.role;
  readonly permissions = this.permissionService;

  isNodeCategory(category: string | undefined): boolean {
    return NODE_CATEGORIES.includes(category as (typeof NODE_CATEGORIES)[number]);
  }

  splitTags(tags: string[] | undefined): string[] {
    return parseTags(tags);
  }
}
