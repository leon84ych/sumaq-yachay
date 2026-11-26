import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomainInfo } from '../../models/domain-sheet.model';
import { TranslocoPipe } from '@jsverse/transloco';
import { IndexComponent } from '../../../index/index/index.component';
import { QuotesComponent } from '../../../quotes/quotes/quotes.component';
import { ConceptsComponent } from '../../../concepts/concepts/concepts.component';
import { PassagesComponent } from '../../../passages/passages/passages.component';
import { CharactersComponent } from '../../../characters/characters/characters.component';
import { GlossaryComponent } from '../../../glossary/glossary/glossary.component';
import { PlacesComponent } from '../../../places/places/places.component';
import { RelationsComponent } from '../../../relations/relations/relations.component';
import { AssociationsComponent } from '../../../associations/associations/associations.component';
import { QuestionsComponent } from '../../../questions/questions/questions.component';
import { BookEventsComponent } from '../../../book-events/book-events/book-events.component';

@Component({
  selector: 'app-domain-view-resolver',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoPipe,
    IndexComponent,
    QuotesComponent,
    ConceptsComponent,
    PassagesComponent,
    CharactersComponent,
    GlossaryComponent,
    PlacesComponent,
    RelationsComponent,
    AssociationsComponent,
    QuestionsComponent,
    BookEventsComponent,
  ],
  templateUrl: './domain-view-resolver.component.html',
})
export class DomainViewResolverComponent {
  readonly domain = input<DomainInfo | null>(null);
  readonly bookId = input<string>('');

  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();

  readonly viewKind = computed(() => {
    const current = this.domain();
    return current ? current.id : 'unsupported';
  });

  // readonly conceptRows = computed(() => (this.sheet()?.rows ?? []) as unknown as ConceptRow[]);
  // readonly characterRows = computed(() => (this.sheet()?.rows ?? []) as unknown as CharacterRow[]);
  // readonly glossaryRows = computed(() => (this.sheet()?.rows ?? []) as unknown as GlossaryRow[]);

  // readonly questionRows = computed(() => (this.sheet()?.rows ?? []) as unknown as QuestionRow[]);
  // readonly placeRows = computed(() => (this.sheet()?.rows ?? []) as unknown as PlaceRow[]);
  // readonly bookEventRows = computed(() => (this.sheet()?.rows ?? []) as unknown as BookEvent[]);
  // readonly relationRows = computed(
  //   () => (this.sheet()?.rows ?? []) as unknown as BookRelation[],
  // );
  // readonly associationRows = computed(
  //   () => (this.sheet()?.rows ?? []) as unknown as BookAssociation[],
  // );
}
