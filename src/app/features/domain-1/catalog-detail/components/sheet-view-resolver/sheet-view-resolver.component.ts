import { Component, computed, effect, inject, input, output, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomainSheet } from '../../models/domain-sheet.model';
import { TranslocoPipe } from '@jsverse/transloco';


@Component({
  selector: 'app-sheet-view-resolver-1',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoPipe
  ],
  templateUrl: './sheet-view-resolver.component.html',
})
export class SheetViewResolverComponent {
  //readonly domainDataService = inject(DomainDataService);
  readonly sheet = input<DomainSheet | null>(null);
  readonly bookName = input<string>('');
  readonly bookAuthor = input<string>('');

  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();

  private readonly sheetName = computed(() => this.sheet()?.name ?? null);

  constructor() {
    // On tab render, show rows already stored in IndexedDB before offering the server button.
    effect(() => {
      const name = this.sheetName();
      if (name) {
      //  untracked(() => void this.domainDataService.mergeLocalRows(name));
      }
    });
  }

  readonly viewKind = computed(() => {
    const current = this.sheet();
    return current ? current.name : 'unsupported';
  });

  readonly currentSheet = computed(() => this.sheet() as DomainSheet);
  // readonly conceptRows = computed(() => (this.sheet()?.rows ?? []) as unknown as ConceptRow[]);
  // readonly quoteRows = computed(() => (this.sheet()?.rows ?? []) as unknown as QuoteRow[]);
  // readonly passageRows = computed(() => (this.sheet()?.rows ?? []) as unknown as PassagesRow[]);
  // readonly characterRows = computed(() => (this.sheet()?.rows ?? []) as unknown as CharacterRow[]);
  // readonly glossaryRows = computed(() => (this.sheet()?.rows ?? []) as unknown as GlossaryRow[]);
  //readonly indexRows = computed(() => (this.sheet()?.rows ?? []) as unknown as IndexViewRow[]);
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
