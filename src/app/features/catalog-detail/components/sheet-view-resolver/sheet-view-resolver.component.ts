import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConceptsComponent } from '../../../domain-concepts/domain-concept/concept.component';
import { QuoteGalleryComponent } from '../../../domain-quotes/domain-quote/quote-gallery.component';
import { PassageComponent } from '../../../domain-passages/domain-passage/passage.component';
import { CharacterComponent } from '../../../domain-character/domain-character/character.component';
import {
  GlossaryComponent,
  GlossaryRow,
} from '../../../domain-glosary/domain-glosary/glossary.component';
import {
  CharacterRow,
  ConceptRow,
  DomainSheet,
  PassagesRow,
  QuoteRow,
} from '../../models/domain-sheet.model';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  IndexViewComponent,
  IndexViewRow,
} from '../../../domain-index/domain-index/index-view.component';
import { DomainDataService } from '../../services/domain-data.service';
import { QuestionsComponent } from '../../../domain-questions/domain-questions/question.component';
import { QuestionRow } from '../../../domain-questions/domain-questions/question.model';

@Component({
  selector: 'app-sheet-view-resolver',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoPipe,
    IndexViewComponent,
    ConceptsComponent,
    QuoteGalleryComponent,
    PassageComponent,
    CharacterComponent,
    GlossaryComponent,
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
}
