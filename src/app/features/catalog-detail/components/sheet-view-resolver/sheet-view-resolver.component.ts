import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomainConceptsComponent } from '../../../domain-concepts/domain-concept/domain-concept/domain-concept.component';
import { DomainQuoteComponent } from '../../../domain-quotes/domain-quote/domain-quote.component';
import { DomainPassageComponent } from '../../../domain-passages/domain-passage/domain-passage.component';
import { DomainCharacterComponent } from '../../../domain-character/domain-character/domain-character.component';
import {
  DomainGlossaryComponent,
} from '../../../domain-glosary/domain-glosary/domain-glossary.component';
import {
  DomainSheet,
} from '../../models/domain-sheet.model';
import { CharacterRow } from '../../../domain-character/model/domain-character-row.model';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  DomainIndexComponent,
  IndexViewRow,
} from '../../../domain-index/domain-index/domain-index.component';
import { DomainDataService } from '../../services/domain-data.service';
import { QuestionsComponent } from '../../../domain-questions/domain-questions/question.component';
import { QuestionRow } from '../../../domain-questions/model/domain-question-row.model';
import { PlaceRow } from '../../../domain-places/model/domain-place-row.model';
import { DomainPlacesComponent } from '../../../domain-places/domain-places/domain-places.component';
import { ConceptRow } from '../../../domain-concepts/model/domain-concept-row.model';
import { QuoteRow } from '../../../domain-quotes/model/domain-quote-row.model';
import { GlossaryRow } from '../../../domain-glosary/model/domain-glosary-row.model';
import { PassagesRow } from '../../../domain-passages/model/domain-passage-row.model';

@Component({
  selector: 'app-sheet-view-resolver',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoPipe,
    DomainIndexComponent,
    DomainConceptsComponent,
    DomainQuoteComponent,
    DomainPassageComponent,
    DomainCharacterComponent,
    DomainPlacesComponent,
    DomainGlossaryComponent,
    QuestionsComponent,
  ],
  templateUrl: './sheet-view-resolver.component.html',
})
export class SheetViewResolverComponent {
  readonly domainDataService = inject(DomainDataService);
  readonly sheet = input<DomainSheet | null>(null);
  readonly bookName = input<string>('');
  readonly bookAuthor = input<string>('');

  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();

  readonly viewKind = computed(() => {
    const current = this.sheet();
    return current ? current.name : 'unsupported';
  });

  readonly currentSheet = computed(() => this.sheet() as DomainSheet);
  readonly conceptRows = computed(() => (this.sheet()?.rows ?? []) as unknown as ConceptRow[]);
  readonly quoteRows = computed(() => (this.sheet()?.rows ?? []) as unknown as QuoteRow[]);
  readonly passageRows = computed(() => (this.sheet()?.rows ?? []) as unknown as PassagesRow[]);
  readonly characterRows = computed(() => (this.sheet()?.rows ?? []) as unknown as CharacterRow[]);
  readonly glossaryRows = computed(() => (this.sheet()?.rows ?? []) as unknown as GlossaryRow[]);
  readonly indexRows = computed(() => (this.sheet()?.rows ?? []) as unknown as IndexViewRow[]);
  readonly questionRows = computed(() => (this.sheet()?.rows ?? []) as unknown as QuestionRow[]);
  readonly placeRows = computed(() => (this.sheet()?.rows ?? []) as unknown as PlaceRow[]);
}
