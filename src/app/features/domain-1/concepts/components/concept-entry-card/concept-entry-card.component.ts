import { Component, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionService } from '../../../../../core/services/permission/permission.service';
import { StudyTagDirective } from '../../../../../shared/directives/study-tag.directive';
import { parseTagsFromArray } from '../../../../../shared/tag-picker/tag-picker.mapper';
import { DomainContributorComponent } from '../../../../domain/shared/domain-contributor/domain-contributor.component';
import { DomainEntryCardComponent } from '../../../../domain/shared/domain-entry-card/domain-entry-card.component';
import { ConceptRecord, isConceptNodeCategory } from '../../model/concepts-model';
import { ConceptQuizGeneratorComponent } from '../concept-quiz/concept-quiz.component';

@Component({
  selector: 'app-concept-entry-card-1',
  imports: [
    TranslocoPipe,
    DomainEntryCardComponent,
    ConceptQuizGeneratorComponent,
    DomainContributorComponent,
    StudyTagDirective,
  ],
  templateUrl: './concept-entry-card.component.html',
  styleUrl: './concept-entry-card.component.css',
})
export class ConceptEntryCardComponent {
  private readonly permissionService = inject(PermissionService);

  readonly row = input.required<ConceptRecord>();
  readonly bookName = input('');
  readonly bookAuthor = input('');
  readonly sourceDomain = input('CONCEPTS');
  readonly showActions = input(true);
  readonly showContext = input(false);
  // The quiz generator is disabled in the legacy view as well.
  readonly showQuiz = input(false);
  readonly deleteRequested = output<string>();
  readonly editRequested = output<ConceptRecord>();
  readonly role = this.permissionService.role;
  readonly permissions = this.permissionService;

  isNodeCategory(category: string): boolean {
    return isConceptNodeCategory(category);
  }

  splitTags(tags: string[]): string[] {
    return parseTagsFromArray(tags);
  }
}
